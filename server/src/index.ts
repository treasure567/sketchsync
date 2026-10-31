import { pool } from "./db.ts";
import { startServer } from "./server.ts";

const server = await startServer();
console.log(
  `sketchsync server listening on :${server.port}` +
    (server.crossInstance ? " (redis adapter on)" : ""),
);

const shutdown = async () => {
  console.log("shutting down");
  await server.close();
  await pool.end();
  process.exit(0);
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
