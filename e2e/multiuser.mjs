import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:3001";
const PASSWORD = "sketchsync-demo";
const SHOTS = process.env.SCREENSHOT_DIR ?? tmpdir();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const log = (...args) =>
  console.log(new Date().toISOString().slice(11, 19), ...args);

const newContext = async (email) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("sketchsync-quick-tour-done", "1");
    } catch {}
  });
  if (email) {
    const response = await context.request.post(`${BASE}/api/auth/signin`, {
      data: { email, password: PASSWORD },
    });
    assert.equal(response.status(), 200, `sign in ${email}`);
  }
  return context;
};

const openPage = async (context, url, name) => {
  const page = await context.newPage();
  page.on("pageerror", (error) => log(`[${name}] page error:`, error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/favicon|DevTools|ResizeObserver/.test(message.text())
    ) {
      log(`[${name}] console error:`, message.text().slice(0, 200));
    }
  });
  await page.goto(url);
  await page.waitForFunction(
    () => window.h?.app && window.collab?.portal?.socketInitialized,
    null,
    { timeout: 15000 },
  );
  return page;
};

const liveCount = (page) =>
  page.evaluate(
    () => window.h.elements.filter((element) => !element.isDeleted).length,
  );

const waitForCount = async (page, expected, name, timeout = 8000) => {
  const deadline = Date.now() + timeout;
  let count;
  while (Date.now() < deadline) {
    count = await liveCount(page);
    if (count === expected) {
      return;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`${name}: expected ${expected} elements, saw ${count}`);
};

const drawRectangle = async (page, x, y) => {
  await page.mouse.click(640, 700);
  await page.keyboard.press("Escape");
  await page.keyboard.press("r");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 80, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
};

const ownerContext = await newContext("lecturer@sketchsync.test");
const created = await ownerContext.request.post(`${BASE}/api/boards`, {
  data: { title: "E2E lecture board" },
});
const { board } = await created.json();
const boardUrl = `${BASE}/#board=${board.id}`;
log("board", board.id);

const owner = await openPage(ownerContext, boardUrl, "owner");
await drawRectangle(owner, 300, 200);
await waitForCount(owner, 1, "owner after first draw");

const viewerLink = await (
  await ownerContext.request.post(`${BASE}/api/boards/${board.id}/links`, {
    data: { role: "viewer", expiresInMinutes: 60 },
  })
).json();
const editorLink = await (
  await ownerContext.request.post(`${BASE}/api/boards/${board.id}/links`, {
    data: { role: "editor", expiresInMinutes: null },
  })
).json();

const viewerContext = await newContext(null);
const viewer = await openPage(
  viewerContext,
  `${boardUrl}&invite=${viewerLink.link.token}`,
  "viewer",
);
await waitForCount(viewer, 1, "viewer sees owner's shape on join");
assert.equal(
  await viewer.evaluate(() => window.h.state.viewModeEnabled),
  true,
  "guest viewer is in view mode",
);
log("ok - guest viewer joined in view mode and sees the board");

const editorContext = await newContext("student@sketchsync.test");
const editor = await openPage(
  editorContext,
  `${boardUrl}&invite=${editorLink.link.token}`,
  "editor",
);
await waitForCount(editor, 1, "editor sees board on join");
assert.equal(
  await editor.evaluate(() => window.h.state.viewModeEnabled),
  false,
);
log("ok - signed-in student joined as editor through an editor link");

await drawRectangle(owner, 500, 200);
await Promise.all([
  waitForCount(viewer, 2, "viewer gets owner's 2nd shape"),
  waitForCount(editor, 2, "editor gets owner's 2nd shape"),
]);
await drawRectangle(editor, 300, 400);
await Promise.all([
  waitForCount(owner, 3, "owner gets editor's shape"),
  waitForCount(viewer, 3, "viewer gets editor's shape"),
]);
log("ok - edits from owner and editor reach everyone");

await drawRectangle(viewer, 700, 400);
await viewer.waitForTimeout(800);
assert.equal(await liveCount(viewer), 3, "viewer couldn't draw");
assert.equal(
  await liveCount(owner),
  3,
  "nothing from the viewer reached the owner",
);
log("ok - viewer can't draw");

const cursorSeen = await (async () => {
  await editor.mouse.move(800, 300);
  await editor.mouse.move(820, 320, { steps: 5 });
  await owner.waitForTimeout(500);
  return owner.evaluate(() =>
    [...window.h.state.collaborators.values()].some(
      (c) => c.pointer && c.username === "Grace Hopper",
    ),
  );
})();
assert.equal(cursorSeen, true, "owner sees the editor's named cursor");
log("ok - live cursor with the editor's account name");

const version = await (
  await ownerContext.request.post(`${BASE}/api/boards/${board.id}/versions`, {
    data: { label: "Three shapes" },
  })
).json();
await editor.mouse.click(640, 700);
await editor.keyboard.press("Escape");
await editor.keyboard.press("ControlOrMeta+a");
await editor.keyboard.press("Delete");
await Promise.all([
  waitForCount(owner, 0, "owner sees editor clear the board"),
  waitForCount(viewer, 0, "viewer sees editor clear the board"),
]);
const restore = await (
  await ownerContext.request.post(
    `${BASE}/api/boards/${board.id}/versions/${version.version.id}/restore`,
  )
).json();
log("restore changed", restore.changedElements, "elements");
await Promise.all([
  waitForCount(owner, 3, "owner after restore"),
  waitForCount(viewer, 3, "viewer after restore"),
  waitForCount(editor, 3, "editor after restore"),
]);
log(
  "ok - deleting everything then restoring a version brings the shapes back for everyone",
);

await editorContext.setOffline(true);
await editor.evaluate(() => window.collab.portal.socket.io.engine.close());
await editor.waitForTimeout(300);
await drawRectangle(editor, 700, 200);
await waitForCount(editor, 4, "editor draws while offline");
await owner.waitForTimeout(800);
assert.equal(await liveCount(owner), 3, "owner doesn't see offline edit yet");
await drawRectangle(owner, 900, 450);
await waitForCount(owner, 4, "owner draws while editor is offline");
await editorContext.setOffline(false);
await Promise.all([
  waitForCount(owner, 5, "owner gets the offline edit after reconnect", 15000),
  waitForCount(
    editor,
    5,
    "editor gets the owner's edit after reconnect",
    15000,
  ),
  waitForCount(viewer, 5, "viewer gets both", 15000),
]);
log("ok - offline edit merged on reconnect, both sides converge");

const ids = async (page) =>
  page.evaluate(() =>
    window.h.elements
      .filter((element) => !element.isDeleted)
      .map((element) => `${element.id}:${element.version}`)
      .sort()
      .join(","),
  );
const [a, b, c] = await Promise.all([ids(owner), ids(editor), ids(viewer)]);
assert.equal(a, b, "owner and editor boards identical");
assert.equal(a, c, "owner and viewer boards identical");
log("ok - all three clients hold identical boards");

await ownerContext.request.delete(
  `${BASE}/api/boards/${board.id}/links/${viewerLink.link.token}`,
);
await viewer.waitForFunction(() => !window.collab.portal.socket, null, {
  timeout: 8000,
});
const viewerError = await viewer.evaluate(
  () => document.querySelector(".Dialog")?.textContent ?? "",
);
assert.match(viewerError, /expired|turned off/);
await viewer.screenshot({ path: `${SHOTS}/viewer-revoked.png` });
log(
  "ok - turning off the viewer's link removes them from the board with a message",
);

await owner.screenshot({ path: `${SHOTS}/owner.png` });
await editor.screenshot({ path: `${SHOTS}/editor.png` });
await browser.close();
log("all multi-user checks passed");
