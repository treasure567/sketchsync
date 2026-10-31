import { pool } from "./db.ts";

export type Role = "owner" | "editor" | "viewer";

const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export const isRole = (value: unknown): value is Role =>
  value === "owner" || value === "editor" || value === "viewer";

export const atLeast = (role: Role | undefined, minimum: Role) =>
  !!role && ROLE_RANK[role] >= ROLE_RANK[minimum];

export type BoardAccess = {
  boardId: string;
  role: Role;
  linkExpiresAt: Date | null;
};

export type AccessDenial =
  | "not_found"
  | "sign_in_required"
  | "forbidden"
  | "link_expired";

export const isExpired = (access: BoardAccess, now = Date.now()) =>
  access.linkExpiresAt !== null && access.linkExpiresAt.getTime() <= now;

type AccessRow = {
  member_role: Role | null;
  link_role: Role | null;
  link_expires_at: Date | null;
  link_valid: boolean | null;
};

export const resolveAccess = async (
  boardId: string,
  userId: string | null,
  inviteToken: string | null,
): Promise<BoardAccess | AccessDenial> => {
  const { rows } = await pool.query<AccessRow>(
    `select
       (select role from board_members where board_id = b.id and user_id = $2) as member_role,
       l.role as link_role,
       l.expires_at as link_expires_at,
       (l.revoked_at is null and (l.expires_at is null or l.expires_at > now())) as link_valid
     from boards b
     left join board_links l on l.board_id = b.id and l.token = $3
     where b.id = $1`,
    [boardId, userId, inviteToken],
  );
  const row = rows[0];
  if (!row) {
    return "not_found";
  }

  const linkRole = row.link_valid ? row.link_role : null;
  if (row.member_role && (!linkRole || atLeast(row.member_role, linkRole))) {
    return { boardId, role: row.member_role, linkExpiresAt: null };
  }
  if (linkRole) {
    return { boardId, role: linkRole, linkExpiresAt: row.link_expires_at };
  }
  if (inviteToken && row.link_role) {
    return "link_expired";
  }
  return userId ? "forbidden" : "sign_in_required";
};

export const isDenial = (
  result: BoardAccess | AccessDenial,
): result is AccessDenial => typeof result === "string";
