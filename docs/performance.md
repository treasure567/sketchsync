# Performance: staying smooth with 10,000 objects

The brief asks for "a spatial index so only visible objects are drawn", and we have to answer "How does the board stay smooth with 10,000 objects and a slow connection?". This page covers the spatial index we added to the renderer, the numbers we measured, and the other things that keep a big board fast.

## Short answer

- The editor already drew only the shapes on screen. But to find them it checked every shape against the screen, on every frame you pan or zoom. With 10,000 shapes that check used about 1.3–2 ms of every frame in Chrome on a fast laptop, and about 6 ms with the CPU slowed down 4× to act like a cheaper machine.
- We put the shapes in a grid of 512 × 512 squares. To find what is on screen, the renderer only looks at the squares under the screen. Finding the visible shapes now takes about 0.1–0.2 ms per frame at 10,000 shapes: 7–12× less than before in Chrome, and 20–60× less in the Node benchmark.
- The grid is kept up to date shape by shape. When one shape moves, only that shape's position in the grid is recalculated.
- The drawn result is exactly the same as before: same shapes, same order. Tests compare the old and new code on random boards with thousands of shapes, many views and random edits.
- The network side (sending only changed shapes, acks, compression) is in the sync layer, see the last section.

## How the editor picked what to draw before

Each frame, `Renderer.getRenderableElements` (`packages/editor/scene/Renderer.ts`) did two things:

1. Copied all non-deleted shapes into a new map, leaving out the text you are typing in and the shape you are drawing (those are drawn somewhere else).
2. Went through all of them and kept those whose bounding box touches the screen (`isElementInViewport`).

The result was cached, but the cache key includes the scroll position and zoom. So when you pan, both steps ran again on every frame, for all 10,000 shapes, even though only about 70 of them were on screen.

## How the spatial index works

The code is in two new files:

- `packages/element/src/spatialGrid.ts`: a plain uniform grid. It knows nothing about the editor.
- `packages/element/src/elementSpatialIndex.ts`: keeps the grid in sync with the board's shapes and answers "which shapes touch this rectangle, in drawing order?".

**The grid.** The board is cut into squares of 512 × 512 board units. Each shape is listed in every square its bounding box touches. A typical shape (40–400 units wide) sits in 1 to 4 squares. To answer "what is on screen?", we look up only the squares under the screen (about 5 × 3 squares at 100% zoom on a 1920 × 1080 screen). Then we check each shape found there against the screen exactly. A shape that spans several squares is only checked once.

**Same answer as before.** We wanted the picture to stay exactly the same, so the index reuses the old rules instead of having its own:

- It uses the same function for a shape's bounding box (`getElementBounds`), so rotation, arrows, lines, freehand strokes and labels are handled the same way.
- It computes the screen rectangle with the same arithmetic as `isElementInViewport`, and uses the same "touching counts" edge test.
- The grid only narrows the search. The final yes/no for each candidate is the old test.
- The result is put back in scene order, so shapes stack the same way. With a few hits we sort them. With very many hits (zoomed far out), one pass over the whole list in scene order is cheaper, so we do that instead.
- The cell size is a power of two (512). Then `x / 512` has no rounding error, so a shape and a screen that only touch at a square's border always land in the same square.

**Odd shapes.** Shapes that would cover more than 256 squares (a huge frame, a very long diagonal arrow) go into a short separate list that is checked on every query instead of being copied into thousands of squares. Shapes with broken coordinates (NaN, infinity) go there too, and the old test handles them the same as before.

## What is incremental

The index remembers, for each shape id: the shape object it saw, its `version` number, and its place in the grid. The editor increases `version` on every edit, so a different version means the shape changed.

- **When the board changes** (any edit, a shape added or deleted, a remote update), the renderer builds a new map of shapes, as before. The index walks it once. For each shape it compares the object and the version with what it stored. Only shapes that differ get a new bounding box and a new place in the grid. Shapes that are gone (deleted, or `isDeleted` and therefore left out of the map) are removed from the grid. Most edits do not change the order of shapes, so in the common case the index finds each shape's old entry at the same position and skips the id lookup.
- **When you only pan or zoom**, the map is now kept (we split the old cache in two: one for the map, keyed on the scene; one for the visible list, keyed on the scene and the view). The index then only checks each shape's version number against the stored one. This is a fast loop with no maths (about 0.06 ms for 10,000 shapes). We keep it because some code edits a shape in place without telling the scene (for example while drawing a multi-point line), and the old code would have picked those changes up on the next pan.
- **Labels.** A label on an arrow sits at a point along the arrow. If the arrow moves, the label moves, but the label's own version does not change. So for a label we also store its container (arrow or box) and the container's version, and recompute the label when either changes.
- **Replaced objects.** Collaboration can replace a shape with a new object that has the same version. Because we also compare the object itself, that is caught too.

Things that were special before still work the same way, because they run after the visible list is made and we did not touch them:

- the text being edited and the shape being drawn are left out of the map (unchanged code);
- reordering shapes into a frame while you drag them over it;
- temporary render offsets and opacity overrides (`getVisibleElementsWithRenderOffsets`);
- frame clipping, which happens while drawing.

## Why a uniform grid

We looked at three options.

| Option | Good | Bad |
| --- | --- | --- |
| Uniform grid (what we use) | About 230 lines, plus about 220 to keep it in sync with the board. Easy to explain and test. Moving a shape is "remove from a few squares, add to a few squares". | Very big shapes would fill many squares (we keep those in a separate list). Zoomed far out, the screen covers many squares (we then walk only the squares that have shapes). |
| R-tree (our own) | Handles shapes of very different sizes well. | More code (node splits, rebalancing on delete). Harder to get right and to explain. |
| `rbush` library | Fast, well tested R-tree. | A new dependency. Updating one shape means remove + insert by value, and we would still need all the sync code around it. |

Whiteboard shapes are mostly a similar size and spread over the board, which is the case a grid handles best. The measurements below show the grid query is already a very small part of a frame, so an R-tree would not buy anything visible. We did not add a dependency.

**Why 512.** We tried cell sizes from 128 to 2048 on the same 10,000 shapes (grid query only, without the version check):

| Cell size | Query at 100% zoom | Query at 10% zoom | Build from scratch |
| --------- | ------------------ | ----------------- | ------------------ |
| 128       | 2.8 µs             | 435 µs            | 26 ms              |
| 256       | 1.4 µs             | 128 µs            | 14 ms              |
| **512**   | **1.4 µs**         | **68 µs**         | **11 ms**          |
| 1024      | 1.4 µs             | 50 µs             | 9.8 ms             |
| 2048      | 2.5 µs             | 37 µs             | 9.2 ms             |

Anything from 256 to 1024 works. We picked 512 as the middle. It also keeps squares small on dense boards, where bigger squares would hold many shapes that are not on screen.

## Measurements

All numbers are from one machine: Apple M5 Pro laptop, Node 24, and the Chrome for Testing 153 headless shell. They show the size of the change, not exact numbers for every computer.

### Benchmark (Node)

`packages/element/tests/spatialIndex.bench.ts` builds a board of 10,000 mixed shapes: rectangles, ellipses, diamonds, text, arrows, lines, freehand strokes, boxes with labels, arrows with labels and frames. About 20% of them are rotated, and they are spread over 20,000 × 20,000 units. "Before" is the old linear filter, copied into the benchmark. Each run pans the 1920 × 1080 view by a small step. Times are the mean per call.

| What | Before | After | Faster |
| --- | --- | --- | --- |
| Find visible shapes at 100% zoom (73 visible) | 2.29 ms | 0.059 ms | 39× |
| Find visible shapes at 25% zoom (852 visible) | 2.98 ms | 0.136 ms | 22× |
| Find visible shapes at 10% zoom (4,170 visible) | 3.16 ms | 0.162 ms | 19× |
| Whole `getRenderableElements` for one pan frame | 4.11 ms | 0.066 ms | 62× |
| Whole `getRenderableElements` after one shape moved | 3.90 ms | 1.02 ms | 3.8× |

The "one pan frame" row also includes rebuilding the shape map, which the old code did on every pan frame and the new code skips. In the "one shape moved" row, the new code still rebuilds the map (as before) and walks it once. That is why it is 1 ms and not 0.06 ms.

Keeping the index up to date with 10,000 shapes:

| What                                                       | Time     |
| ---------------------------------------------------------- | -------- |
| New map in which one shape moved (walk all, recompute one) | 0.39 ms  |
| Same map, nothing changed (version check only)             | 0.056 ms |
| Build from scratch (once, when a board is loaded)          | 8.8 ms   |

Run it yourself:

```bash
npx vitest bench --run packages/element/tests/spatialIndex.bench.ts
```

### In a real browser

We also measured the running app (dev build) in headless Chromium at 1920 × 1080. We loaded 10,000 shapes with the same mix and panned by 20 × 8 pixels per frame for 240 frames. To compare fairly, the script put the old linear filter back into the same page and panned again. It ran new, old, new, old; the ranges below cover both runs of each. In every run the old and new visible lists were identical.

| Case | `getRenderableElements` per call, before → after | Main-thread time per frame, before → after | Median frame time, before → after |
| --- | --- | --- | --- |
| 100% zoom, 76 shapes visible | 0.67–0.98 → 0.08–0.10 ms | 6.0–7.6 → 5.0–5.4 ms | 16.7 → 16.7 ms (60 fps both) |
| 25% zoom, 926 shapes visible | 0.93–0.99 → 0.23–0.25 ms | 13.1–14.0 → 12.0–12.5 ms | 16.7 → 16.7 ms |
| 100% zoom, CPU slowed down 4× | 2.7–3.0 → 0.28–0.34 ms | 24.5–26.8 → 17.0–21.2 ms | 24.8–27.2 → 17.9–21.5 ms |

The app calls `getRenderableElements` about twice per frame. On a fast laptop both versions reach 60 fps, but the index frees about 1–2 ms of each frame. On the slowed-down CPU (which is closer to a cheap laptop or an older phone), the old filter alone takes about 6 ms of each frame. Panning goes from about 37–40 fps to about 47–56 fps.

At 10% zoom about 2,000 shapes are on screen. Drawing them takes most of the frame (17–20 ms) with either version. The index still saves about 0.6 ms per call there.

The script lives outside the repo, in the scratchpad of whoever ran it. To repeat it: start `cd app && BROWSER=none npx vite --port 3021 --strictPort`, open the page with Playwright, create shapes with `convertToSketchSyncElements`, load them with `h.app.api.updateScene`, and wrap `h.app.renderer.getRenderableElements` to time it. Read `TaskDuration` from the Chrome DevTools Protocol `Performance.getMetrics` before and after the pan.

## What the index does not fix

Being honest about the limits:

- **Still one cheap pass per frame.** Panning still walks all shapes once to compare version numbers (about 0.06 ms at 10,000). This could be removed if every edit told the scene which shapes changed, but today some edits do not.
- **Edits still touch every shape once.** After any change the renderer rebuilds its map of shapes (as before) and the index walks it, about 1 ms in total at 10,000 shapes.
- **Clicking and hovering still check every shape.** Hit testing (`getElementsAtPosition` in `App.tsx`) still loops over all shapes. The index can answer "which shapes are near this point?" (`getElementsInBounds`). But hit testing also has to allow for line thickness, frame name labels and selection handles, and that code lives in `App.tsx`, which was outside this task. It is the next step.
- **Drawing is still drawing.** When zoomed out with thousands of shapes on screen, painting them takes most of the frame. The index does not change that.
- **Dragging one shape.** In a profile of dragging one rectangle on the 10,000-shape board, the biggest cost was not drawing or finding shapes. It was the editor's undo history copying shape data on each change (`_deepCopyElement` called from `store.ts`), then `getSelectedElements` and hit testing. Per drag step the main thread was busy about 11–13 ms with either version of the renderer. We did not change that code.

## What else keeps 10,000 objects smooth

Things that were already in the editor:

- **Shapes are drawn once and reused.** The rough.js outline of each shape is cached (`ShapeCache` in `packages/element/src/shape.ts`). Each shape is also painted once onto its own small offscreen canvas, which is then copied onto the board with `drawImage`. That small canvas is only repainted when the shape changes, the theme changes, or the zoom settles at a new level (not on every step of a zoom gesture).
- **Only what is on screen is drawn.** This "viewport culling" existed before. The spatial index makes the "what is on screen?" step cheap.
- **At most one redraw per frame.** The board is redrawn through `renderStaticSceneThrottled`, which uses `requestAnimationFrame`. Many changes within one frame lead to one redraw.
- **Separate canvases.** The board, the selection and handles, and the shape you are drawing are on separate canvases. Moving the mouse over the board or drawing a new shape does not redraw the 10,000 shapes.

Our sync layer (the slow-connection part):

- We are changing sync to send only the shapes that changed, instead of the whole board, and the server acknowledges each update so the client knows what arrived.
- We are turning on websocket compression, so each message is smaller on a slow link.

[sync-protocol.md](sync-protocol.md) has the details.

## Tests

- `packages/element/tests/spatialIndex.test.ts`: the grid (insert, move, remove, touching edges, huge and broken shapes, a random comparison against checking everything), and the shape index (same result and order as the old filter on 3,000 random shapes and 60 random views; adding, moving, replacing and deleting shapes; in-place edits; rotation; arrows, lines and freehand strokes; arrow labels that move with their arrow; 40 random edits in a row).
- `packages/editor/tests/scene/renderer.test.ts`: the real `Renderer` gives the same visible list as the old filter. It still leaves out the text being edited and the shape being drawn, reuses its map while panning, and picks up shapes edited without telling the scene.
- The existing renderer tests (`renderOverrides.test.tsx`, frame tests) and the full `packages/element` and `packages/editor` suites pass without changing any snapshots.
