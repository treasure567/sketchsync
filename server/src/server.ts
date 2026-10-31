import { createServer, type RequestListener } from "node:http";

import { Server } from "socket.io";

import { createCollab } from "./collab.ts";
import { config } from "./config.ts";
import { migrate, waitForDatabase } from "./db.ts";
import { createApp } from "./http.ts";
import { initRooms, shutdownRooms } from "./rooms.ts";

const useRedisAdapter = async (io: Server, url: string) => {
  const { createClient } = await import("redis");
  const { createAdapter } = await import("@socket.io/redis-adapter");
  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();
  for (const client of [pubClient, subClient]) {
    client.on("error", (error) => console.error("redis:", error.message));
  }
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  return () => Promise.all([pubClient.quit(), subClient.quit()]);
};

export const startServer = async (port = config.port) => {
  await waitForDatabase();
  await migrate();

  // socket.io wraps the server's existing request listener when it attaches, so
  // the listener must exist first; the Express app is plugged in once ready.
  let handleRequest: RequestListener = (_req, res) => {
    res.statusCode = 503;
    res.end();
  };
  const httpServer = createServer((req, res) => handleRequest(req, res));
  const io = new Server(httpServer, {
    maxHttpBufferSize: config.maxSocketMessageBytes,
    perMessageDeflate: { threshold: 1024 },
    cors: config.corsOrigins.length
      ? { origin: config.corsOrigins, credentials: true }
      : undefined,
  });

  const closeRedis = config.redisUrl
    ? await useRedisAdapter(io, config.redisUrl)
    : null;
  const crossInstance = closeRedis !== null;

  initRooms(io, { crossInstance });
  const collab = createCollab(io, { crossInstance });
  handleRequest = createApp(collab);

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  const address = httpServer.address();
  const boundPort =
    typeof address === "object" && address ? address.port : port;

  return {
    port: boundPort,
    crossInstance,
    close: async () => {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await shutdownRooms();
      await closeRedis?.();
    },
  };
};
