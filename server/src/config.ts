const env = process.env;

const MiB = 1024 * 1024;
const MINUTE = 60 * 1000;

const listFromEnv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  port: Number(env.PORT ?? 3002),
  databaseUrl:
    env.DATABASE_URL ??
    "postgres://sketchsync:sketchsync@127.0.0.1:5433/sketchsync",
  redisUrl: env.REDIS_URL || null,
  corsOrigins: listFromEnv(env.CORS_ORIGINS),
  maxSceneBytes: Number(env.MAX_SCENE_BYTES ?? 50 * MiB),
  maxFileBytes: Number(env.MAX_FILE_BYTES ?? 5 * MiB),
  maxShareLinkBytes: Number(env.MAX_SHARE_LINK_BYTES ?? 50 * MiB),
  maxSocketMessageBytes: Number(env.MAX_SOCKET_MESSAGE_BYTES ?? 50 * MiB),
  sessionDays: Number(env.SESSION_DAYS ?? 30),
  opsPerCompaction: Number(env.OPS_PER_COMPACTION ?? 500),
  autoVersionIntervalMs: Number(env.AUTO_VERSION_INTERVAL_MS ?? 30 * MINUTE),
  roomUnloadDelayMs: Number(env.ROOM_UNLOAD_DELAY_MS ?? MINUTE),
  deletedElementRetentionDays: Number(env.DELETED_ELEMENT_RETENTION_DAYS ?? 30),
};
