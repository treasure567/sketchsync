import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

import { config } from "./config.ts";
import { pool } from "./db.ts";

import type { NextFunction, Request, Response } from "express";

export type User = { id: string; email: string; name: string };

declare module "express-serve-static-core" {
  interface Request {
    user: User | null;
  }
}

export const SESSION_COOKIE = "sketchsync_session";

const SCRYPT_OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 };
const SCRYPT_KEY_LENGTH = 64;

const deriveKey = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "base64");
  const actual = await deriveKey(password, Buffer.from(salt, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    `insert into sessions (token_hash, user_id, expires_at)
     values ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), userId, config.sessionDays],
  );
  return token;
};

export const deleteSession = async (token: string) => {
  await pool.query("delete from sessions where token_hash = $1", [
    hashToken(token),
  ]);
};

export const findUserBySession = async (token: string) => {
  const { rows } = await pool.query<User>(
    `select u.id, u.email, u.name from sessions s
     join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
};

export const parseCookies = (header: string | undefined) => {
  const cookies = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0) {
      cookies.set(
        part.slice(0, separator).trim(),
        decodeURIComponent(part.slice(separator + 1).trim()),
      );
    }
  }
  return cookies;
};

export const userFromCookieHeader = async (header: string | undefined) => {
  const token = parseCookies(header).get(SESSION_COOKIE);
  return token ? findUserBySession(token) : null;
};

export const setSessionCookie = (
  req: Request,
  res: Response,
  token: string,
) => {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    path: "/",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
};

export const loadUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  req.user = await userFromCookieHeader(req.get("cookie"));
  next();
};

export const requireUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    res.status(401).json({ error: "sign_in_required" });
    return;
  }
  next();
};
