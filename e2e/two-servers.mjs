import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../server/package.json", import.meta.url),
);
const { io } = require("socket.io-client");

const [first, second] = (
  process.argv[2] ?? "http://127.0.0.1:3002,http://127.0.0.1:3003"
).split(",");
const PASSWORD = "sketchsync-demo";

const signIn = async (base, email) => {
  const response = await fetch(`${base}/api/auth/signin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.equal(response.status, 200, `sign in at ${base}`);
  return response.headers.get("set-cookie").split(";")[0];
};

const api = async (base, cookie, path, method = "GET", body) => {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      cookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.status === 204 ? null : response.json();
};

const join = (base, boardId, { cookie, invite } = {}) =>
  new Promise((resolve, reject) => {
    const socket = io(base, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: cookie ? { cookie } : {},
      auth: invite ? { invite } : {},
    });
    const client = { socket, init: null, updates: [], revoked: null };
    socket.on("client-broadcast", (message) => {
      if (message.type === "SCENE_INIT" && !client.init) {
        client.init = message.payload.elements;
        resolve(client);
      } else if (message.type === "SCENE_UPDATE") {
        client.updates.push(...message.payload.elements);
      }
    });
    socket.on("access-revoked", (reason) => (client.revoked = reason));
    socket.once("init-room", () => socket.emit("join-room", boardId));
    socket.once("access-denied", reject);
    socket.once("connect_error", reject);
  });

const until = async (check, what) => {
  const deadline = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error(`timed out: ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const element = (id, version) => ({
  id,
  type: "rectangle",
  version,
  versionNonce: version * 7,
  index: `a${id}`,
  isDeleted: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  updated: Date.now(),
});

const cookieA = await signIn(first, "lecturer@sketchsync.test");
const cookieB = await signIn(second, "lecturer@sketchsync.test");
const { board } = await api(first, cookieA, "/boards", "POST", {
  title: "Two servers",
});

const onFirst = await join(first, board.id, { cookie: cookieA });
const onSecond = await join(second, board.id, { cookie: cookieB });

const ack = await onFirst.socket
  .timeout(3000)
  .emitWithAck("server-broadcast", board.id, {
    type: "SCENE_UPDATE",
    payload: { elements: [element("from-first", 1)] },
  });
assert.deepEqual(ack, { ok: true });
await until(
  () => onSecond.updates.some((el) => el.id === "from-first"),
  "edit crosses servers",
);
console.log(
  "ok - an edit on server 1 reaches a client on server 2 through Redis",
);

await onSecond.socket.timeout(3000).emitWithAck("server-broadcast", board.id, {
  type: "SCENE_UPDATE",
  payload: { elements: [element("from-second", 1)] },
});
const lateJoiner = await join(second, board.id, { cookie: cookieB });
assert.deepEqual(lateJoiner.init.map((el) => el.id).sort(), [
  "from-first",
  "from-second",
]);
console.log(
  "ok - server 2's in-memory board includes edits accepted by server 1",
);

const { link } = await api(
  first,
  cookieA,
  `/boards/${board.id}/links`,
  "POST",
  {
    role: "viewer",
    expiresInMinutes: 60,
  },
);
const guestOnSecond = await join(second, board.id, { invite: link.token });
await api(first, cookieA, `/boards/${board.id}/links/${link.token}`, "DELETE");
await until(
  () => guestOnSecond.revoked === "link_expired",
  "revocation crosses servers",
);
console.log(
  "ok - turning off a link on server 1 disconnects a guest on server 2",
);

for (const client of [onFirst, onSecond, lateJoiner, guestOnSecond]) {
  client.socket.close();
}
console.log("all two-server checks passed");
