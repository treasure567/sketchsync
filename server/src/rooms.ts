import { config } from "./config.ts";
import { pool } from "./db.ts";
import {
  isSceneElement,
  liveElements,
  mergeElements,
  newVersionNonce,
  orderedElements,
  withoutOldTombstones,
} from "./elements.ts";

import type { SceneElement } from "./elements.ts";
import type { PoolClient } from "pg";
import type { Server } from "socket.io";

type Room = {
  boardId: string;
  elements: Map<string, SceneElement>;
  opsSinceCompaction: number;
};

type Queryable = Pick<PoolClient, "query">;

type QueuedOp = {
  boardId: string;
  userId: string | null;
  elements: SceneElement[];
  resolve: () => void;
  reject: (error: unknown) => void;
};

const MAX_OPS_PER_INSERT = 200;
// Ops are folded into a snapshot only once settled: a slow insert can commit a
// lower seq after a higher one is already visible.
const COMPACTION_SETTLE_SECONDS = 10;

const rooms = new Map<string, Promise<Room>>();
const unloadTimers = new Map<string, NodeJS.Timeout>();
let io: Server | null = null;
let crossInstance = false;

export const initRooms = (
  server: Server,
  options: { crossInstance: boolean },
) => {
  io = server;
  crossInstance = options.crossInstance;
  if (crossInstance) {
    server.on("room-ops", (boardId: string, elements: unknown) => {
      void applyFromPeer(boardId, elements);
    });
    server.on("room-forget", (boardId: string) => {
      rooms.delete(boardId);
    });
  }
};

export const loadBoardState = async (
  boardId: string,
  db: Queryable = pool,
  { settledOnly = false } = {},
) => {
  const { rows } = await db.query<{
    snapshot: SceneElement[];
    snapshot_seq: string;
  }>("select snapshot, snapshot_seq from boards where id = $1", [boardId]);
  if (!rows[0]) {
    return null;
  }
  const elements = new Map(
    rows[0].snapshot.map((element) => [element.id, element]),
  );
  let lastSeq = Number(rows[0].snapshot_seq);
  const ops = await db.query<{ seq: string; elements: SceneElement[] }>(
    `select seq, elements from board_ops
     where board_id = $1 and seq > $2
       and ($3::boolean is false or created_at < now() - make_interval(secs => $4))
     order by seq`,
    [boardId, lastSeq, settledOnly, COMPACTION_SETTLE_SECONDS],
  );
  for (const op of ops.rows) {
    mergeElements(elements, op.elements);
    lastSeq = Number(op.seq);
  }
  return { elements, lastSeq, opCount: ops.rows.length };
};

const loadRoom = async (boardId: string): Promise<Room> => {
  const state = await loadBoardState(boardId);
  if (!state) {
    throw new Error(`board ${boardId} not found`);
  }
  return {
    boardId,
    elements: state.elements,
    opsSinceCompaction: state.opCount,
  };
};

export const getRoom = (boardId: string) => {
  let room = rooms.get(boardId);
  if (!room) {
    room = loadRoom(boardId);
    rooms.set(boardId, room);
    room.catch(() => rooms.delete(boardId));
  }
  return room;
};

export const currentElements = async (boardId: string) => {
  const room = rooms.get(boardId);
  if (room) {
    return (await room).elements;
  }
  return (await loadBoardState(boardId))?.elements ?? null;
};

const applyFromPeer = async (boardId: string, elements: unknown) => {
  const room = rooms.get(boardId);
  if (room && Array.isArray(elements)) {
    mergeElements((await room).elements, elements.filter(isSceneElement));
  }
};

let opQueue: QueuedOp[] = [];
let flushing = false;

// Group commit: while one insert is in flight, new ops queue up and go out
// together in the next insert, so load turns into fewer, larger writes.
const flushOps = async () => {
  if (flushing) {
    return;
  }
  flushing = true;
  try {
    while (opQueue.length) {
      const batch = opQueue.slice(0, MAX_OPS_PER_INSERT);
      opQueue = opQueue.slice(MAX_OPS_PER_INSERT);
      try {
        await pool.query(
          `insert into board_ops (board_id, user_id, elements)
           select board_id, user_id, elements
           from jsonb_to_recordset($1::jsonb)
             as op(board_id text, user_id uuid, elements jsonb)`,
          [
            JSON.stringify(
              batch.map((op) => ({
                board_id: op.boardId,
                user_id: op.userId,
                elements: op.elements,
              })),
            ),
          ],
        );
        await pool.query(
          "update boards set updated_at = now() where id = any($1::text[])",
          [[...new Set(batch.map((op) => op.boardId))]],
        );
        batch.forEach((op) => op.resolve());
      } catch (error) {
        batch.forEach((op) => op.reject(error));
      }
    }
  } finally {
    flushing = false;
  }
};

const persistOp = (
  boardId: string,
  userId: string | null,
  elements: SceneElement[],
) =>
  new Promise<void>((resolve, reject) => {
    opQueue.push({ boardId, userId, elements, resolve, reject });
    void flushOps();
  });

export const applyUpdate = async (
  boardId: string,
  elements: SceneElement[],
  userId: string | null,
) => {
  const room = await getRoom(boardId);
  const accepted = mergeElements(room.elements, elements);
  if (!accepted.length) {
    return accepted;
  }
  try {
    await persistOp(boardId, userId, accepted);
  } catch (error) {
    // The merge already changed the in-memory board; drop it so the next
    // access reloads what is really stored and the client's retry is accepted.
    rooms.delete(boardId);
    throw error;
  }
  if (crossInstance) {
    io?.serverSideEmit("room-ops", boardId, accepted);
  }
  room.opsSinceCompaction++;
  if (room.opsSinceCompaction >= config.opsPerCompaction) {
    room.opsSinceCompaction = 0;
    compact(boardId).catch((error) =>
      console.error(`compaction of ${boardId} failed:`, error),
    );
  }
  return accepted;
};

const insertVersion = async (
  db: Queryable,
  boardId: string,
  elements: SceneElement[],
  kind: "auto" | "manual" | "before-restore",
  label: string | null,
  userId: string | null,
) => {
  const { rows } = await db.query<{ id: string; createdAt: Date }>(
    `insert into board_versions (board_id, label, kind, elements, element_count, created_by)
     values ($1, $2, $3, $4, $5, $6)
     returning id, created_at as "createdAt"`,
    [boardId, label, kind, JSON.stringify(elements), elements.length, userId],
  );
  return rows[0];
};

const createAutoVersionIfDue = async (
  db: Queryable,
  boardId: string,
  elements: Iterable<SceneElement>,
) => {
  const { rows } = await db.query<{ created_at: Date }>(
    `select created_at from board_versions
     where board_id = $1 and kind <> 'before-restore'
     order by created_at desc limit 1`,
    [boardId],
  );
  const lastVersionAt = rows[0]?.created_at.getTime() ?? 0;
  if (Date.now() - lastVersionAt >= config.autoVersionIntervalMs) {
    await insertVersion(
      db,
      boardId,
      liveElements(elements),
      "auto",
      null,
      null,
    );
  }
};

export const compact = async (boardId: string) => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `board:${boardId}`,
    ]);
    const state = await loadBoardState(boardId, client, { settledOnly: true });
    if (state && state.opCount > 0) {
      const snapshot = withoutOldTombstones(
        orderedElements(state.elements.values()),
        config.deletedElementRetentionDays,
      );
      await client.query(
        "update boards set snapshot = $2, snapshot_seq = $3 where id = $1",
        [boardId, JSON.stringify(snapshot), state.lastSeq],
      );
      await createAutoVersionIfDue(client, boardId, snapshot);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

export const cancelUnload = (boardId: string) => {
  clearTimeout(unloadTimers.get(boardId));
  unloadTimers.delete(boardId);
};

export const scheduleUnload = (
  boardId: string,
  hasLocalSockets: () => boolean,
) => {
  cancelUnload(boardId);
  unloadTimers.set(
    boardId,
    setTimeout(() => {
      unloadTimers.delete(boardId);
      if (hasLocalSockets()) {
        return;
      }
      rooms.delete(boardId);
      compact(boardId).catch((error) =>
        console.error(`compaction of ${boardId} failed:`, error),
      );
    }, config.roomUnloadDelayMs),
  );
};

export const forgetRoom = (boardId: string) => {
  cancelUnload(boardId);
  rooms.delete(boardId);
  if (crossInstance) {
    io?.serverSideEmit("room-forget", boardId);
  }
};

const waitForPendingOps = async () => {
  while (flushing || opQueue.length) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

export const shutdownRooms = async () => {
  for (const timer of unloadTimers.values()) {
    clearTimeout(timer);
  }
  unloadTimers.clear();
  await waitForPendingOps();
  const boardIds = [...rooms.keys()];
  rooms.clear();
  await Promise.allSettled(boardIds.map(compact));
};

export const createVersion = async (
  boardId: string,
  label: string | null,
  userId: string | null,
) => {
  const elements = await currentElements(boardId);
  if (!elements) {
    return null;
  }
  return insertVersion(
    pool,
    boardId,
    liveElements(elements.values()),
    "manual",
    label,
    userId,
  );
};

export const listVersions = async (boardId: string) => {
  const { rows } = await pool.query<{
    id: string;
    label: string | null;
    kind: string;
    elementCount: number;
    createdAt: Date;
    createdByName: string | null;
  }>(
    `select v.id, v.label, v.kind, v.element_count as "elementCount",
            v.created_at as "createdAt", u.name as "createdByName"
     from board_versions v left join users u on u.id = v.created_by
     where v.board_id = $1
     order by v.created_at desc
     limit 200`,
    [boardId],
  );
  return rows;
};

export const getVersionElements = async (
  boardId: string,
  versionId: string,
) => {
  const { rows } = await pool.query<{ elements: SceneElement[] }>(
    "select elements from board_versions where board_id = $1 and id = $2",
    [boardId, versionId],
  );
  return rows[0]?.elements ?? null;
};

// A restore is a new edit, not a rewind: changed elements get a higher version so
// they win on every client, and the current board is saved first so it can be undone.
export const restoreVersion = async (
  boardId: string,
  versionId: string,
  userId: string | null,
) => {
  const wanted = await getVersionElements(boardId, versionId);
  if (!wanted) {
    return null;
  }
  const room = await getRoom(boardId);
  await insertVersion(
    pool,
    boardId,
    liveElements(room.elements.values()),
    "before-restore",
    null,
    userId,
  );

  const wantedById = new Map(wanted.map((element) => [element.id, element]));
  const updated = Date.now();
  const changes: SceneElement[] = [];

  for (const current of room.elements.values()) {
    const target = wantedById.get(current.id);
    if (target) {
      const unchanged =
        !current.isDeleted &&
        current.version === target.version &&
        current.versionNonce === target.versionNonce;
      if (!unchanged) {
        changes.push({
          ...target,
          isDeleted: false,
          version: Math.max(current.version, target.version) + 1,
          versionNonce: newVersionNonce(),
          updated,
        });
      }
    } else if (!current.isDeleted) {
      changes.push({
        ...current,
        isDeleted: true,
        version: current.version + 1,
        versionNonce: newVersionNonce(),
        updated,
      });
    }
  }
  for (const target of wanted) {
    if (!room.elements.has(target.id)) {
      changes.push({ ...target, updated });
    }
  }

  const accepted = await applyUpdate(boardId, changes, userId);
  if (accepted.length) {
    io?.to(boardId).emit("client-broadcast", {
      type: "SCENE_UPDATE",
      payload: { elements: accepted },
    });
  }
  return accepted.length;
};
