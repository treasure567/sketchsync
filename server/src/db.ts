import { readdir, readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

import pg from "pg";

import { config } from "./config.ts";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);
// Any fixed number works; it only has to be the same on every instance so
// that two servers starting together don't run migrations twice.
const MIGRATION_LOCK_ID = 7_413_001;

export const waitForDatabase = async (attempts = 30) => {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      console.log(`database not ready (attempt ${attempt}), retrying...`);
      await sleep(1000);
    }
  }
};

export const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(
      `create table if not exists schema_migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );
    const { rows } = await client.query<{ name: string }>(
      "select name from schema_migrations",
    );
    const applied = new Set(rows.map((row) => row.name));
    const pending = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith(".sql") && !applied.has(name))
      .sort();

    for (const name of pending) {
      const sql = await readFile(new URL(name, MIGRATIONS_DIR), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [
          name,
        ]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      console.log(`applied migration ${name}`);
    }
  } finally {
    await client
      .query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID])
      .catch(() => {});
    client.release();
  }
};
