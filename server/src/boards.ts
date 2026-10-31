import { randomBytes } from "node:crypto";

import { pool } from "./db.ts";

import type { Role } from "./access.ts";
import type { SceneElement } from "./elements.ts";

export type BoardSummary = {
  id: string;
  title: string;
  role: Role;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
};

export const newBoardId = () => randomBytes(12).toString("base64url");
export const newLinkToken = () => randomBytes(18).toString("base64url");
// The app encrypts images with an AES-128-GCM key in JWK `k` form, which is
// 16 random bytes in base64url.
export const newFileKey = () => randomBytes(16).toString("base64url");

export const createBoard = async (
  ownerId: string,
  title: string,
  elements: SceneElement[],
) => {
  const id = newBoardId();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into boards (id, title, owner_id, file_key, snapshot)
       values ($1, $2, $3, $4, $5)`,
      [id, title, ownerId, newFileKey(), JSON.stringify(elements)],
    );
    await client.query(
      "insert into board_members (board_id, user_id, role) values ($1, $2, 'owner')",
      [id, ownerId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return id;
};

export const getBoard = async (boardId: string) => {
  const { rows } = await pool.query<{
    id: string;
    title: string;
    file_key: string;
    owner_id: string;
    owner_name: string;
    updated_at: Date;
  }>(
    `select b.id, b.title, b.file_key, b.owner_id, u.name as owner_name, b.updated_at
     from boards b join users u on u.id = b.owner_id
     where b.id = $1`,
    [boardId],
  );
  return rows[0] ?? null;
};

export const listBoards = async (userId: string) => {
  const { rows } = await pool.query<BoardSummary>(
    `select b.id, b.title, m.role, u.name as "ownerName",
            b.created_at as "createdAt", b.updated_at as "updatedAt"
     from board_members m
     join boards b on b.id = m.board_id
     join users u on u.id = b.owner_id
     where m.user_id = $1
     order by b.updated_at desc`,
    [userId],
  );
  return rows;
};

export const renameBoard = async (boardId: string, title: string) => {
  await pool.query(
    "update boards set title = $2, updated_at = now() where id = $1",
    [boardId, title],
  );
};

export const deleteBoard = async (boardId: string) => {
  await pool.query("delete from boards where id = $1", [boardId]);
  await pool.query("delete from files where scope = $1", [`rooms/${boardId}`]);
};

export const listMembers = async (boardId: string) => {
  const { rows } = await pool.query<{
    userId: string;
    name: string;
    email: string;
    role: Role;
  }>(
    `select u.id as "userId", u.name, u.email, m.role
     from board_members m join users u on u.id = m.user_id
     where m.board_id = $1
     order by case m.role when 'owner' then 0 when 'editor' then 1 else 2 end, u.name`,
    [boardId],
  );
  return rows;
};

export const findUserIdByEmail = async (email: string) => {
  const { rows } = await pool.query<{ id: string }>(
    "select id from users where email = $1",
    [email.trim().toLowerCase()],
  );
  return rows[0]?.id ?? null;
};

export const setMemberRole = async (
  boardId: string,
  userId: string,
  role: Exclude<Role, "owner">,
) => {
  await pool.query(
    `insert into board_members (board_id, user_id, role) values ($1, $2, $3)
     on conflict (board_id, user_id) do update set role = excluded.role
     where board_members.role <> 'owner'`,
    [boardId, userId, role],
  );
};

export const removeMember = async (boardId: string, userId: string) => {
  await pool.query(
    "delete from board_members where board_id = $1 and user_id = $2 and role <> 'owner'",
    [boardId, userId],
  );
};

type LinkRow = {
  token: string;
  role: Exclude<Role, "owner">;
  expiresAt: Date | null;
  createdAt: Date;
};

export const listLinks = async (boardId: string) => {
  const { rows } = await pool.query<LinkRow>(
    `select token, role, expires_at as "expiresAt", created_at as "createdAt"
     from board_links
     where board_id = $1 and revoked_at is null
       and (expires_at is null or expires_at > now())
     order by created_at desc`,
    [boardId],
  );
  return rows;
};

export const createLink = async (
  boardId: string,
  role: Exclude<Role, "owner">,
  expiresInMinutes: number | null,
  createdBy: string,
) => {
  const { rows } = await pool.query<LinkRow>(
    `insert into board_links (token, board_id, role, expires_at, created_by)
     values ($1, $2, $3,
             case when $4::int is null then null else now() + make_interval(mins => $4::int) end,
             $5)
     returning token, role, expires_at as "expiresAt", created_at as "createdAt"`,
    [newLinkToken(), boardId, role, expiresInMinutes, createdBy],
  );
  return rows[0];
};

export const revokeLink = async (boardId: string, token: string) => {
  await pool.query(
    "update board_links set revoked_at = now() where board_id = $1 and token = $2",
    [boardId, token],
  );
};
