import express from "express";

import { loadUser } from "./auth.ts";
import { config } from "./config.ts";
import { authRoutes } from "./routes/auth.ts";
import { boardRoutes } from "./routes/boards.ts";
import { storageRoutes } from "./routes/storage.ts";

import type { Collab } from "./collab.ts";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Session cookies are SameSite=Lax; also refusing cross-site JSON writes means
// another site can't make a signed-in browser change boards.
const rejectCrossSiteWrites = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const origin = req.get("origin");
  if (
    MUTATING_METHODS.has(req.method) &&
    origin &&
    !config.corsOrigins.includes(origin) &&
    new URL(origin).host !== req.get("host")
  ) {
    res.status(403).json({ error: "cross_site_request" });
    return;
  }
  next();
};

const cors = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("origin");
  if (origin && config.corsOrigins.includes(origin)) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, PUT, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Board-Invite",
      Vary: "Origin",
    });
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};

export const createApp = (collab: Collab) => {
  const app = express();
  app.disable("x-powered-by");
  // Only reachable through the reverse proxy, which sets X-Forwarded-*.
  app.set("trust proxy", true);

  app.use("/api", cors, rejectCrossSiteWrites, loadUser);
  app.use("/api", express.json({ limit: config.maxSceneBytes }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRoutes());
  app.use("/api/boards", boardRoutes(collab));
  app.use("/api", storageRoutes());

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error?.type === "entity.too.large") {
      res.status(413).json({
        error: "too_large",
        error_class: "RequestTooLargeError",
        message: `Request is longer than the server limit of ${error.limit} bytes`,
      });
      return;
    }
    if (error?.type === "entity.parse.failed") {
      res.status(400).json({ error: "invalid_json" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  };
  app.use(onError);

  return app;
};
