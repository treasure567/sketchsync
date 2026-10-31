import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.argv[2] ?? "http://localhost:3001";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});
await context.addInitScript(() =>
  localStorage.setItem("sketchsync-quick-tour-done", "1"),
);
await context.request.post(`${BASE}/api/auth/signin`, {
  data: { email: "lecturer@sketchsync.test", password: "sketchsync-demo" },
});
const boardA = (
  await (
    await context.request.post(`${BASE}/api/boards`, {
      data: { title: "A", elements: [] },
    })
  ).json()
).board;
const boardB = (
  await (
    await context.request.post(`${BASE}/api/boards`, {
      data: { title: "B", elements: [] },
    })
  ).json()
).board;

const page = await context.newPage();
page.on("pageerror", (error) => console.log("page error:", error.message));
await page.goto(BASE);
await page.waitForFunction(() => window.h?.app);

const draw = async (x, y) => {
  await page.mouse.click(640, 700);
  await page.keyboard.press("Escape");
  await page.keyboard.press("r");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 60, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
};
const live = () =>
  page.evaluate(() =>
    window.h.elements.filter((e) => !e.isDeleted).map((e) => e.id),
  );

await draw(300, 300);
await page.waitForTimeout(600);
const scratchIds = await live();
assert.equal(scratchIds.length, 1);

await page.evaluate((id) => {
  window.location.hash = `board=${id}`;
}, boardA.id);
await page.waitForFunction(
  () => window.collab?.portal?.socketInitialized,
  null,
  { timeout: 10000 },
);
await draw(500, 200);
await draw(700, 200);
await page.waitForTimeout(500);

await page.evaluate((id) => {
  window.location.hash = `board=${id}`;
}, boardB.id);
await page.waitForFunction(
  (id) =>
    window.collab?.portal?.roomId === id &&
    window.collab.portal.socketInitialized,
  boardB.id,
  { timeout: 10000 },
);
await draw(400, 450);
await page.waitForTimeout(800);

await page.evaluate(() => window.collab.stopCollaboration());
await page.waitForTimeout(800);
const afterLeaving = await live();
assert.deepEqual(
  afterLeaving,
  scratchIds,
  "the scratch canvas is back unchanged after visiting two boards",
);

await page.reload();
await page.waitForFunction(() => window.h?.app);
await page.waitForTimeout(800);
assert.deepEqual(await live(), scratchIds, "and it survives a reload");

const sceneA = await (
  await context.request.get(`${BASE}/api/boards/${boardA.id}/scene`)
).json();
const sceneB = await (
  await context.request.get(`${BASE}/api/boards/${boardB.id}/scene`)
).json();
assert.equal(
  sceneA.elements.filter((e) => !e.isDeleted).length,
  2,
  "board A kept its two shapes",
);
assert.equal(
  sceneB.elements.filter((e) => !e.isDeleted).length,
  1,
  "board B kept its one shape",
);
console.log(
  "ok - scratch canvas untouched by switching between boards; each board kept its own shapes",
);
await browser.close();
