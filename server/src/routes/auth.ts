import express from "express";

import {
  clearSessionCookie,
  createSession,
  deleteSession,
  hashPassword,
  parseCookies,
  requireUser,
  SESSION_COOKIE,
  setSessionCookie,
  verifyPassword,
} from "../auth.ts";
import { pool } from "../db.ts";
import { rateLimit } from "../rateLimit.ts";
import { isEmail, isName, isPassword } from "../validation.ts";

import type { User } from "../auth.ts";

const UNIQUE_VIOLATION = "23505";

// Checked when the email is unknown, so a wrong email takes as long as a wrong
// password and the response time doesn't reveal which accounts exist.
const DUMMY_PASSWORD_HASH = await hashPassword("not-a-real-password");

export const authRoutes = () => {
  const router = express.Router();
  const limitAttempts = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

  router.post("/signup", limitAttempts, async (req, res) => {
    const { email, name, password } = req.body ?? {};
    if (!isEmail(email) || !isName(name) || !isPassword(password)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    let user: User;
    try {
      const { rows } = await pool.query<User>(
        `insert into users (email, name, password_hash) values ($1, $2, $3)
         returning id, email, name`,
        [email.trim().toLowerCase(), name.trim(), await hashPassword(password)],
      );
      user = rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        res.status(409).json({ error: "email_taken" });
        return;
      }
      throw error;
    }
    setSessionCookie(req, res, await createSession(user.id));
    res.status(201).json({ user });
  });

  router.post("/signin", limitAttempts, async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isEmail(email) || typeof password !== "string") {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const { rows } = await pool.query<User & { password_hash: string }>(
      "select id, email, name, password_hash from users where email = $1",
      [email.trim().toLowerCase()],
    );
    const found = rows[0];
    const passwordMatches = await verifyPassword(
      password,
      found?.password_hash ?? DUMMY_PASSWORD_HASH,
    );
    if (!found || !passwordMatches) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    setSessionCookie(req, res, await createSession(found.id));
    res.json({ user: { id: found.id, email: found.email, name: found.name } });
  });

  router.post("/signout", async (req, res) => {
    const token = parseCookies(req.get("cookie")).get(SESSION_COOKIE);
    if (token) {
      await deleteSession(token);
    }
    clearSessionCookie(res);
    res.sendStatus(204);
  });

  router.get("/me", (req, res) => {
    res.json({ user: req.user });
  });

  router.patch("/me", requireUser, async (req, res) => {
    const { name } = req.body ?? {};
    if (!isName(name)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const { rows } = await pool.query<User>(
      "update users set name = $2 where id = $1 returning id, email, name",
      [req.user!.id, name.trim()],
    );
    res.json({ user: rows[0] });
  });

  return router;
};
