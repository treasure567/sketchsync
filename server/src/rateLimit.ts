import type { NextFunction, Request, Response } from "express";

export const rateLimit = ({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) {
        for (const [ip, { resetAt }] of hits) {
          if (resetAt <= now) {
            hits.delete(ip);
          }
        }
      }
      next();
      return;
    }
    entry.count++;
    if (entry.count > max) {
      res
        .status(429)
        .set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)))
        .json({ error: "too_many_requests" });
      return;
    }
    next();
  };
};
