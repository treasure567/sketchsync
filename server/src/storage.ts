import { randomBytes } from "node:crypto";

import { pool } from "./db.ts";

export const getFile = async (scope: string, fileId: string) => {
  const { rows } = await pool.query<{ data: Buffer }>(
    "select data from files where scope = $1 and file_id = $2",
    [scope, fileId],
  );
  return rows[0]?.data ?? null;
};

// File ids are content hashes, so a file never changes once stored and a
// second upload of the same id is ignored rather than allowed to overwrite.
export const saveFile = async (scope: string, fileId: string, data: Buffer) => {
  await pool.query(
    `insert into files (scope, file_id, data) values ($1, $2, $3)
     on conflict (scope, file_id) do nothing`,
    [scope, fileId, data],
  );
};

export const createShareLink = async (data: Buffer) => {
  const id = randomBytes(12).toString("base64url");
  await pool.query("insert into share_links (id, data) values ($1, $2)", [
    id,
    data,
  ]);
  return id;
};

export const getShareLink = async (id: string) => {
  const { rows } = await pool.query<{ data: Buffer }>(
    "select data from share_links where id = $1",
    [id],
  );
  return rows[0]?.data ?? null;
};
