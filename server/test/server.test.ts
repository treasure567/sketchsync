import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { io as connect } from "socket.io-client";

import type { Socket } from "socket.io-client";

process.env.DATABASE_URL ??=
  "postgres://sketchsync:sketchsync@127.0.0.1:5433/sketchsync_test";
process.env.ROOM_UNLOAD_DELAY_MS = "50";

const { pool } = await import("../src/db.ts");
await pool.query("drop schema public cascade; create schema public;");
const { startServer } = await import("../src/server.ts");
const { compact } = await import("../src/rooms.ts");

type Session = { cookie: string | null };
type Element = Record<string, unknown> & { id: string; version: number };
type Message = { type: string; payload: Record<string, any> };
type Client = {
  socket: Socket;
  role: string | null;
  initElements: Element[];
  messages: Message[];
  events: Map<string, unknown[]>;
};

let server: Awaited<ReturnType<typeof startServer>>;
let base = "";
const sockets: Socket[] = [];

before(async () => {
  server = await startServer(0);
  base = `http://127.0.0.1:${server.port}`;
});

after(async () => {
  sockets.forEach((socket) => socket.close());
  await server.close();
  await pool.end();
});

const api = async (
  path: string,
  {
    method = "GET",
    body,
    session,
    invite,
    headers = {},
  }: {
    method?: string;
    body?: unknown;
    session?: Session;
    invite?: string;
    headers?: Record<string, string>;
  } = {},
) => {
  const requestHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) {
    requestHeaders["content-type"] = "application/json";
  }
  if (session?.cookie) {
    requestHeaders.cookie = session.cookie;
  }
  if (invite) {
    requestHeaders["x-board-invite"] = invite;
  }
  const response = await fetch(base + path, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (session && setCookie) {
    session.cookie = setCookie.split(";")[0];
  }
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as Record<string, any>) : null,
  };
};

let userCount = 0;
const signUp = async (name: string) => {
  const session: Session = { cookie: null };
  const email = `${name.toLowerCase()}-${++userCount}-${Date.now()}@test.dev`;
  const response = await api("/api/auth/signup", {
    method: "POST",
    body: { email, name, password: "correct horse battery" },
    session,
  });
  assert.equal(response.status, 201);
  return { session, email, user: response.body!.user as { id: string } };
};

const element = (id: string, version: number, extra: object = {}) =>
  ({
    id,
    type: "rectangle",
    version,
    versionNonce: 1000 + version,
    index: `a${id}`,
    isDeleted: false,
    x: version,
    y: 0,
    width: 10,
    height: 10,
    updated: Date.now(),
    ...extra,
  } as Element);

const createBoard = async (session: Session, elements: Element[] = []) => {
  const response = await api("/api/boards", {
    method: "POST",
    body: { title: "Lecture 1", elements },
    session,
  });
  assert.equal(response.status, 201);
  return response.body!.board.id as string;
};

const openBoard = (
  boardId: string,
  { session, invite }: { session?: Session; invite?: string } = {},
) =>
  new Promise<Client>((resolve, reject) => {
    const socket = connect(base, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: session?.cookie ? { cookie: session.cookie } : {},
      auth: invite ? { invite } : {},
    });
    sockets.push(socket);
    const client: Client = {
      socket,
      role: null,
      initElements: [],
      messages: [],
      events: new Map(),
    };
    socket.onAny((event: string, ...args: unknown[]) => {
      client.events.set(event, args);
    });
    socket.on("access", (access: { role: string }) => {
      client.role = access.role;
    });
    let initialised = false;
    socket.on("client-broadcast", (message: Message) => {
      if (message.type === "SCENE_INIT" && !initialised) {
        initialised = true;
        client.initElements = message.payload.elements;
        resolve(client);
      } else {
        client.messages.push(message);
      }
    });
    socket.once("init-room", () => socket.emit("join-room", boardId));
    socket.once("access-denied", (reason: string) => {
      socket.close();
      reject(new Error(reason));
    });
    socket.once("connect_error", reject);
  });

const sendElements = (client: Client, boardId: string, elements: Element[]) =>
  client.socket.timeout(3000).emitWithAck("server-broadcast", boardId, {
    type: "SCENE_UPDATE",
    payload: { elements },
  }) as Promise<{ ok: boolean; error?: string }>;

const waitFor = async (check: () => boolean, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

const sceneUpdates = (client: Client) =>
  client.messages
    .filter((message) => message.type === "SCENE_UPDATE")
    .flatMap((message) => message.payload.elements as Element[]);

describe("accounts", () => {
  test("sign up, read the session, sign out, sign back in", async () => {
    const { session, email } = await signUp("Ada");
    const me = await api("/api/auth/me", { session });
    assert.equal(me.body!.user.name, "Ada");

    assert.equal(
      (await api("/api/auth/signout", { method: "POST", session })).status,
      204,
    );
    assert.equal((await api("/api/auth/me", { session })).body!.user, null);

    const wrong = await api("/api/auth/signin", {
      method: "POST",
      body: { email, password: "wrong password" },
    });
    assert.equal(wrong.status, 401);

    const fresh: Session = { cookie: null };
    const signIn = await api("/api/auth/signin", {
      method: "POST",
      body: { email: email.toUpperCase(), password: "correct horse battery" },
      session: fresh,
    });
    assert.equal(signIn.status, 200);
    assert.ok(fresh.cookie);
  });

  test("an email can only be used once", async () => {
    const { email } = await signUp("Grace");
    const again = await api("/api/auth/signup", {
      method: "POST",
      body: { email, name: "Grace", password: "another password" },
    });
    assert.equal(again.status, 409);
  });

  test("writes from another site are refused", async () => {
    const response = await api("/api/auth/signup", {
      method: "POST",
      body: { email: "x@test.dev", name: "X", password: "whatever123" },
      headers: { origin: "https://evil.example" },
    });
    assert.equal(response.status, 403);
  });
});

describe("board permissions", () => {
  test("owners see their boards; strangers and anonymous users don't", async () => {
    const owner = await signUp("Owner");
    const stranger = await signUp("Stranger");
    const boardId = await createBoard(owner.session);

    const list = await api("/api/boards", { session: owner.session });
    assert.ok(list.body!.boards.some((board: any) => board.id === boardId));

    assert.equal(
      (await api(`/api/boards/${boardId}`, { session: stranger.session }))
        .status,
      403,
    );
    assert.equal((await api(`/api/boards/${boardId}`)).status, 401);
    assert.equal(
      (await api("/api/boards/doesNotExist", { session: owner.session }))
        .status,
      404,
    );
  });

  test("members get the role the owner gives them", async () => {
    const owner = await signUp("Owner");
    const student = await signUp("Student");
    const boardId = await createBoard(owner.session);

    const add = await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: student.email, role: "viewer" },
      session: owner.session,
    });
    assert.equal(add.status, 201);

    const asStudent = await api(`/api/boards/${boardId}`, {
      session: student.session,
    });
    assert.equal(asStudent.body!.board.role, "viewer");

    const forbidden = await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: owner.email, role: "editor" },
      session: student.session,
    });
    assert.equal(forbidden.status, 403);

    const unknown = await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: "nobody@test.dev", role: "editor" },
      session: owner.session,
    });
    assert.equal(unknown.status, 404);
  });

  test("share links grant their role until they expire or are revoked", async () => {
    const owner = await signUp("Owner");
    const boardId = await createBoard(owner.session);
    const created = await api(`/api/boards/${boardId}/links`, {
      method: "POST",
      body: { role: "viewer", expiresInMinutes: 60 },
      session: owner.session,
    });
    assert.equal(created.status, 201);
    const token = created.body!.link.token as string;

    const asGuest = await api(`/api/boards/${boardId}`, { invite: token });
    assert.equal(asGuest.body!.board.role, "viewer");
    assert.ok(asGuest.body!.board.linkExpiresAt);

    await pool.query(
      "update board_links set expires_at = now() - interval '1 second' where token = $1",
      [token],
    );
    assert.equal(
      (await api(`/api/boards/${boardId}`, { invite: token })).status,
      410,
    );

    const forever = await api(`/api/boards/${boardId}/links`, {
      method: "POST",
      body: { role: "editor", expiresInMinutes: null },
      session: owner.session,
    });
    const foreverToken = forever.body!.link.token as string;
    assert.equal(
      (await api(`/api/boards/${boardId}`, { invite: foreverToken })).body!
        .board.role,
      "editor",
    );
    await api(`/api/boards/${boardId}/links/${foreverToken}`, {
      method: "DELETE",
      session: owner.session,
    });
    assert.equal(
      (await api(`/api/boards/${boardId}`, { invite: foreverToken })).status,
      410,
    );
  });
});

describe("live sync", () => {
  test("joining sends the board; edits reach others once, with acks", async () => {
    const owner = await signUp("Owner");
    const boardId = await createBoard(owner.session, [element("one", 1)]);
    const alice = await openBoard(boardId, { session: owner.session });
    const bob = await openBoard(boardId, { session: owner.session });

    assert.equal(alice.role, "owner");
    assert.deepEqual(
      alice.initElements.map((el) => el.id),
      ["one"],
    );

    const ack = await sendElements(alice, boardId, [
      element("one", 2),
      element("two", 1),
    ]);
    assert.deepEqual(ack, { ok: true });
    await waitFor(() => sceneUpdates(bob).length === 2);

    const stale = await sendElements(alice, boardId, [element("one", 1)]);
    assert.deepEqual(stale, { ok: true });
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(sceneUpdates(bob).length, 2, "older versions aren't relayed");
    assert.equal(sceneUpdates(alice).length, 0, "senders don't get echoes");
  });

  test("equal versions are settled by the lower versionNonce, like the client", async () => {
    const owner = await signUp("Owner");
    const boardId = await createBoard(owner.session, [element("shape", 1)]);
    const a = await openBoard(boardId, { session: owner.session });
    const b = await openBoard(boardId, { session: owner.session });

    await sendElements(a, boardId, [
      element("shape", 2, { versionNonce: 50, x: 100 }),
    ]);
    await sendElements(b, boardId, [
      element("shape", 2, { versionNonce: 10, isDeleted: true }),
    ]);
    await sendElements(a, boardId, [
      element("shape", 2, { versionNonce: 50, x: 100 }),
    ]);

    const late = await openBoard(boardId, { session: owner.session });
    const shape = late.initElements.find((el) => el.id === "shape")!;
    assert.equal(shape.isDeleted, true);
    assert.equal(shape.versionNonce, 10);
  });

  test("viewers receive edits but can't make them", async () => {
    const owner = await signUp("Owner");
    const viewer = await signUp("Viewer");
    const boardId = await createBoard(owner.session);
    await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: viewer.email, role: "viewer" },
      session: owner.session,
    });
    const editorClient = await openBoard(boardId, { session: owner.session });
    const viewerClient = await openBoard(boardId, { session: viewer.session });
    assert.equal(viewerClient.role, "viewer");

    const refused = await sendElements(viewerClient, boardId, [
      element("sneaky", 1),
    ]);
    assert.deepEqual(refused, { ok: false, error: "read_only" });

    await sendElements(editorClient, boardId, [element("legit", 1)]);
    await waitFor(() =>
      sceneUpdates(viewerClient).some((el) => el.id === "legit"),
    );

    const scene = await api(`/api/boards/${boardId}/scene`, {
      session: owner.session,
    });
    assert.deepEqual(
      scene.body!.elements.map((el: Element) => el.id),
      ["legit"],
    );
  });

  test("presence messages are stamped with the sender's real identity", async () => {
    const owner = await signUp("Lecturer");
    const boardId = await createBoard(owner.session);
    const a = await openBoard(boardId, { session: owner.session });
    const b = await openBoard(boardId, { session: owner.session });

    a.socket.emit("server-volatile-broadcast", boardId, {
      type: "MOUSE_LOCATION",
      payload: { socketId: "spoofed", username: "Someone else", pointer: {} },
    });
    await waitFor(() =>
      b.messages.some((message) => message.type === "MOUSE_LOCATION"),
    );
    const cursor = b.messages.find(
      (message) => message.type === "MOUSE_LOCATION",
    )!;
    assert.equal(cursor.payload.socketId, a.socket.id);
    assert.equal(cursor.payload.username, "Lecturer");
  });

  test("revoking a link or changing a role applies to open connections", async () => {
    const owner = await signUp("Owner");
    const member = await signUp("Member");
    const boardId = await createBoard(owner.session);
    const link = await api(`/api/boards/${boardId}/links`, {
      method: "POST",
      body: { role: "editor", expiresInMinutes: null },
      session: owner.session,
    });
    await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: member.email, role: "editor" },
      session: owner.session,
    });

    const guest = await openBoard(boardId, { invite: link.body!.link.token });
    const memberClient = await openBoard(boardId, { session: member.session });
    assert.equal(guest.role, "editor");

    await api(`/api/boards/${boardId}/links/${link.body!.link.token}`, {
      method: "DELETE",
      session: owner.session,
    });
    await waitFor(() => guest.events.has("access-revoked"));
    assert.deepEqual(guest.events.get("access-revoked"), ["link_expired"]);

    await api(`/api/boards/${boardId}/members/${member.user.id}`, {
      method: "PATCH",
      body: { role: "viewer" },
      session: owner.session,
    });
    await waitFor(() => memberClient.role === "viewer");
    const refused = await sendElements(memberClient, boardId, [
      element("x", 1),
    ]);
    assert.equal(refused.error, "read_only");
  });

  test("an expiring link cuts off a connected guest at the deadline", async () => {
    const owner = await signUp("Owner");
    const boardId = await createBoard(owner.session);
    const link = await api(`/api/boards/${boardId}/links`, {
      method: "POST",
      body: { role: "viewer", expiresInMinutes: 1 },
      session: owner.session,
    });
    const token = link.body!.link.token as string;
    const guest = await openBoard(boardId, { invite: token });

    await pool.query(
      "update board_links set expires_at = now() + interval '300 milliseconds' where token = $1",
      [token],
    );
    await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: (await signUp("Other")).email, role: "viewer" },
      session: owner.session,
    });
    await waitFor(() => guest.events.has("access-revoked"), 3000);
  });
});

describe("persistence and versions", () => {
  test("the board survives everyone leaving, compaction and a reload", async () => {
    const owner = await signUp("Owner");
    const boardId = await createBoard(owner.session, [element("a", 1)]);
    const client = await openBoard(boardId, { session: owner.session });
    for (let version = 2; version <= 6; version++) {
      await sendElements(client, boardId, [element("a", version)]);
    }
    await sendElements(client, boardId, [element("b", 1)]);
    client.socket.close();

    const ops = await pool.query(
      "select count(*)::int as count from board_ops where board_id = $1",
      [boardId],
    );
    assert.equal(ops.rows[0].count, 6);

    await new Promise((resolve) => setTimeout(resolve, 200));
    await pool.query(
      "update board_ops set created_at = now() - interval '1 minute' where board_id = $1",
      [boardId],
    );
    await compact(boardId);
    const board = await pool.query(
      "select snapshot, snapshot_seq from boards where id = $1",
      [boardId],
    );
    assert.deepEqual(
      board.rows[0].snapshot.map((el: Element) => [el.id, el.version]),
      [
        ["a", 6],
        ["b", 1],
      ],
    );

    const again = await openBoard(boardId, { session: owner.session });
    assert.deepEqual(
      again.initElements.map((el) => [el.id, el.version]),
      [
        ["a", 6],
        ["b", 1],
      ],
    );
  });

  test("restoring a version is a new edit that every client receives", async () => {
    const owner = await signUp("Owner");
    const boardId = await createBoard(owner.session, [
      element("keep", 1),
      element("change", 1),
    ]);
    const a = await openBoard(boardId, { session: owner.session });
    const b = await openBoard(boardId, { session: owner.session });

    const saved = await api(`/api/boards/${boardId}/versions`, {
      method: "POST",
      body: { label: "Before the exam" },
      session: owner.session,
    });
    assert.equal(saved.status, 201);
    const versionId = saved.body!.version.id as string;

    await sendElements(a, boardId, [
      element("change", 2, { x: 999 }),
      element("added", 1),
    ]);
    await waitFor(() => sceneUpdates(b).length === 2);

    const restore = await api(
      `/api/boards/${boardId}/versions/${versionId}/restore`,
      { method: "POST", session: owner.session },
    );
    assert.equal(restore.status, 200);
    assert.equal(restore.body!.changedElements, 2);

    await waitFor(() => sceneUpdates(a).length === 2);
    const restored = new Map(sceneUpdates(a).map((el) => [el.id, el]));
    assert.equal(restored.get("change")!.x, 1);
    assert.equal(restored.get("change")!.version, 3);
    assert.equal(restored.get("added")!.isDeleted, true);

    const versions = await api(`/api/boards/${boardId}/versions`, {
      session: owner.session,
    });
    assert.deepEqual(
      versions.body!.versions.map((version: any) => version.kind),
      ["before-restore", "manual"],
    );
  });
});

describe("files", () => {
  test("board images need board access; editors upload, viewers read", async () => {
    const owner = await signUp("Owner");
    const viewer = await signUp("Viewer");
    const boardId = await createBoard(owner.session);
    await api(`/api/boards/${boardId}/members`, {
      method: "POST",
      body: { email: viewer.email, role: "viewer" },
      session: owner.session,
    });
    const url = `${base}/api/files/rooms/${boardId}/image1`;
    const upload = (session: Session) =>
      fetch(url, {
        method: "PUT",
        headers: { cookie: session.cookie! },
        body: new Uint8Array([1, 2, 3]),
      });

    assert.equal((await upload(viewer.session)).status, 403);
    assert.equal((await upload(owner.session)).status, 204);
    const read = await fetch(url, {
      headers: { cookie: viewer.session.cookie! },
    });
    assert.equal(read.status, 200);
    assert.deepEqual(
      new Uint8Array(await read.arrayBuffer()),
      new Uint8Array([1, 2, 3]),
    );
    assert.equal((await fetch(url)).status, 404);
  });
});
