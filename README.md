# SketchSync

A collaborative whiteboard for lecturers, study groups and teams: sketch, diagram and wireframe on phones and laptops, with no install, even on a poor connection.

> **Status:** the frontend is complete and works fully **in a single browser**, online or offline. Boards, profile and library are stored locally (`localStorage`). Real-time collaboration, accounts and cross-device sync need the backend, which has not been built yet. See [What remains](#what-remains).

## Contents

- [Features](#features)
- [Compared with real-world whiteboards](#compared-with-real-world-whiteboards)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [How the whiteboard works](#how-the-whiteboard-works)
- [Data storage](#data-storage)
- [Security](#security)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [What remains](#what-remains)
- [Reference: Excalidraw](#reference-excalidraw)

## Features

### Pages

| Route | Page |
| ----- | ---- |
| `/` | Landing page: hero with a live board illustration, feature sections, testimonials, call to action, footer |
| `/signup`, `/signin` | Passwordless email flow ("check your email", resend countdown, expired link at `/signin?link=expired`) and Google, GitHub and Facebook buttons |
| `/dashboard` | Your boards, templates, filters, search, sort and grid or list view |
| `/board/new`, `/board/:id` | The whiteboard (`/board/new?template=…` starts from a template) |
| `/b/:id?token=…` | Share links: open only while enabled, unexpired, and with the right token |
| `/settings` | Account settings: profile, avatar, cursor colour, ink style, board usage, delete account |
| `/help` | Getting started, every tool, every shortcut, and questions |
| `/privacy`, `/terms` | Privacy policy and terms of service, written for local-only storage |
| anything else | A friendly 404. Render or loading errors show a recovery screen instead of a blank page. |

> **Sign-in is not real yet.** The Google, GitHub and Facebook buttons go straight to the dashboard, because there is no authentication server.

### Whiteboard tools

| Tool | Key | What it does |
| ---- | --- | ------------ |
| Select | V | Click, Shift-click or drag a box; move; resize with handles (Shift keeps proportions) |
| Hand | H | Pan (Space+drag, the middle button and the wheel also pan) |
| Rectangle, Diamond, Ellipse | R, D, O | Shift for equal sides |
| Arrow, Line | A, L | **Connectors:** ends released over a shape attach to it and follow it |
| Pencil | P | Smoothed curves with **pressure-sensitive width** (pen pressure, or simulated from speed) and **palm rejection** |
| Text | T | Click to type (or double-click empty canvas); sizes S, M, L and XL |
| Sticky note | N | Coloured notes with handwritten text |
| Image | I | Pick, **drop** or **paste** images; they're downscaled and re-encoded for storage |
| Eraser | E | Drag over elements to erase them |
| Laser pointer | K | A fading red trail for presenting; it isn't saved |
| Tool lock | Q | Keep the current tool after drawing |

### Editing

- **Style panel:**
  - stroke and background colours (with a custom picker);
  - solid, hatch or cross fill; stroke width; solid, dashed or dotted lines;
  - rounded or sharp edges, opacity and text size.
- **Arranging:**
  - layer order;
  - **group / ungroup**;
  - **align** (left, centre, right, top, middle, bottom) and **distribute** (horizontally, vertically);
  - lock elements in place.
- **Editing helpers:**
  - undo and redo (a whole drag is one step);
  - cut, copy and paste, including between boards;
  - duplicate, and arrow-key **nudging**.
- **Grid and snapping** (Ctrl '), **zoom to fit or to selection** (Shift 1, Shift 2), pinch to zoom, and a **minimap**.
- **Library:**
  - six built-in pieces (decision diamond, service container, connector, mobile wireframe, sticky note, UML class box) plus your own saved selections;
  - click or drag them onto the canvas.
- **Board outline** (Alt O): the whole board as a text list for screen-reader and keyboard users, with select, show and delete.
- **Share dialog:**
  - share link with a 128-bit token, default role, expiry countdown and a sign-in requirement;
  - disable or re-create the link;
  - an invite list.
- **Main menu:**
  - open, or save to a `.json` file;
  - **export to PNG (2×), SVG and PDF**;
  - insert an image, toggle the grid and outline, clear the canvas, and show shortcuts.
- **Board extras:**
  - an editable title, autosave with a save indicator, and a welcome screen on empty boards;
  - a hint for each tool;
  - selection colour taken from your profile's cursor colour.

### Dashboard

- Boards with live thumbnails, element counts, last-edited times and stars.
- Rename, duplicate, move to trash, restore, and delete forever.
- Filters (all, created by me, shared, recent, starred, trash), search, sort, and grid or list view.
- Templates (Blank, Brainstorm, Lecture Notes, Flowchart) and a templates library dialog.
- A free-plan usage meter, a mobile drawer, and an empty state for new users.

### Works offline

In production builds, a service worker caches the app after the first visit. With no connection, every page opens and new boards can be created. Boards are stored locally, so nothing is lost while offline.

## Compared with real-world whiteboards

SketchSync was checked against Excalidraw (whose source tool list is `selection, lasso, rectangle, diamond, ellipse, arrow, line, freedraw, text, image, eraser, hand, frame, magicframe, embeddable, laser`) and tldraw.

| Capability | Excalidraw | tldraw | SketchSync |
| ---------- | :--------: | :----: | :--------: |
| Shapes, arrows, lines, freehand, text, eraser, hand | ✓ | ✓ | ✓ |
| Sticky notes | — | ✓ | ✓ |
| Images (insert, drop, paste) | ✓ | ✓ | ✓ |
| Connectors attached to shapes | ✓ | ✓ | ✓ (straight) |
| Laser pointer | ✓ | ✓ | ✓ |
| Group, align, distribute, lock, layer order | ✓ | ✓ | ✓ |
| Grid and snapping | ✓ | ✓ | ✓ (grid) |
| Library | ✓ | — | ✓ |
| Export PNG / SVG | ✓ | ✓ | ✓ (+ PDF) |
| Offline (service worker) | ✓ | ✓ | ✓ |
| Pressure-sensitive pencil, palm rejection | ✓ | ✓ | ✓ |
| Accessible text alternative | partial | partial | ✓ (board outline) |
| Real-time collaboration | ✓ | ✓ | needs backend |
| Rotation, flip | ✓ | ✓ | not yet |
| Frames, lasso, embeds, elbow arrows | ✓ | ✓ | not yet |
| Dark mode, find on canvas | ✓ | ✓ | not yet |

## Getting started

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # type-check and build apps/web to apps/web/dist
pnpm lint       # oxlint across the workspace
pnpm preview    # serve the production build (http://localhost:4173)
```

The service worker and the Content Security Policy only apply to production builds. Use `pnpm build && pnpm preview` to try offline mode.

### Configuration

| Variable        | Default                  | Purpose                                                             |
| --------------- | ------------------------ | ------------------------------------------------------------------- |
| `VITE_SITE_URL` | `https://sketchsync.dev` | Public address used for absolute URLs in link-preview (Open Graph) tags |

Copy `apps/web/.env.example` to `apps/web/.env` to override it, or set it when building.

### Deploying

`apps/web/dist` is a static single-page app:
- Serve `index.html` for any route that doesn't match a file, so deep links like `/board/<id>` work.
- If possible, also send the Content Security Policy as an HTTP header, and add `frame-ancestors 'none'`.

## Project structure

The repository is a pnpm workspace. The sync server will live in `apps/server` and shared code in `packages/`.

```
apps/web/
  public/                 favicon, app icons, web manifest, Open Graph image, robots.txt
  src/
    lib/board/            whiteboard engine (no React)
      types.ts            element, style and camera types
      geometry.ts         bounds, hit-testing, camera maths, resize handles
      elements.ts         element factories, cloning, strict validation of stored/imported data
      bindings.ts         connectors attached to shapes
      render.ts           canvas renderer (styles, pressure strokes, images, grid, selection)
      actions.ts          duplicate, delete, lock, restyle, layers, group, align, distribute
      images.ts           image downscaling/re-encoding and decode cache
      clipboard.ts        cross-board clipboard
      library.ts          built-in and user library items
      builders.ts         helpers for composing ready-made elements
      export.ts           PNG, SVG and PDF export
      storage.ts          board file format (open / save)
      text.ts             text measuring and wrapping
    lib/boards/           board index (metadata, share settings) and templates
    lib/profile.ts        user profile, avatar processing, local data wipe
    hooks/                useBoardHistory (undo/redo), useBoards, useProfile, useDocumentTitle, …
    components/
      board/              canvas, toolbar, style panel, library, outline, minimap, dialogs, editor
      dashboard/          sidebar, top bar, board cards, templates
      landing/            landing page sections and illustrations
      auth/               sign-up / sign-in cards and layout
      settings/           account settings
      layout/             navbar, content pages, error/404 pages, loading screen
      ui/                 shared button, menu, dialog, avatar, keyboard hint
    pages/                one component per route (lazy-loaded, except the landing page)
```

## How the whiteboard works

The engine lives in `src/lib/board` and doesn't use React, so it can be tested on its own and later driven by a sync layer.

- **Model:** a board is an ordered array of elements in world coordinates. Array order is draw order.
- **Rendering:** each frame is drawn to an HTML canvas at the device's pixel ratio. Elements outside the viewport are skipped (bounding-box culling). Images draw from a decode cache and trigger a redraw once loaded.
- **Camera:** a world point `p` appears on screen at `(p - camera) * zoom`. Zoom keeps the point under the cursor or between the fingers fixed.
- **Hit-testing:** this is done per shape. Filled shapes count their inside; unfilled shapes count only their outline; lines and strokes use distance to their segments.
- **Connectors:** an arrow or line stores the ids of the shapes its ends are attached to. After every move, resize, delete or undo, `updateBindings` re-routes each attached end to the point on its shape's outline facing the other end. Moving a connector on its own detaches it.
- **Input:** a single pointer-event state machine handles pan, pinch, move, resize, marquee, create, draw, erase and laser. Mouse, pen and touch share the same code. Moves and resizes are measured from where they started, so grid snapping is exact.
- **History:** a gesture works as begin, then many updates, then commit, which becomes one undo step, and a gesture can also be cancelled. History currently stores whole snapshots and is per tab.
- **Saving:** each board autosaves 400 ms after the last change, and immediately when the page is closed.

## Data storage

Everything is stored in the browser's `localStorage`:

| Key                                  | Contents                                          |
| ------------------------------------ | ------------------------------------------------- |
| `sketchsync:boards`                  | board index: names, types, stars, trash, share settings |
| `sketchsync:board-content:<id>`      | a board's elements, including images as data URLs |
| `sketchsync:library`                 | your saved library items                          |
| `sketchsync:clipboard`               | the last copied elements                          |
| `sketchsync:profile`                 | name, email, handle, role, avatar, cursor colour, ink setting |

A few things to know:
- **Storage is small.** Browsers allow roughly 5 MB per site, so images are capped at 1600 px and stored as WebP.
- **Tabs stay in sync.** The dashboard listens for storage events, and board changes re-read the stored index before writing, so one tab can't overwrite another tab's changes.

## Security

The frontend has no server yet, so the main risks are untrusted input (opened files, stored data, images) and the browser environment.

- **Strict validation:** every element read from storage, opened files, the clipboard or the library is rebuilt field by field:
  - numbers must be finite, types must be known, and colours must be hex or `transparent`;
  - images must be base64 PNG, JPEG, WebP or GIF data URLs;
  - text, point counts, sizes, opacity and image size are all capped.

  A malformed or hostile file can't crash a board or inject markup.
- **Image privacy:** added images are re-encoded, which strips metadata such as GPS location.
- **Safe exports:** SVG export also XML-escapes text, colours and image data. Diagram files over 20 MB and images over 20 MB are refused.
- **Share tokens:** 128-bit tokens from `crypto.getRandomValues`. `/b/:id` only opens while the link is enabled, unexpired and the token matches.
- **Content Security Policy:** production builds only allow the site's own scripts, styles and fonts, plus same-origin, `data:` and `blob:` images. The service worker registers from an external script, so no inline script is needed. A strict referrer policy is set too.
- **No HTML injection:** there's no `innerHTML`, `eval` or `dangerouslySetInnerHTML`, and React escapes all user text. External links use `rel="noreferrer"`.
- **Clean audit:** `pnpm audit` reports no known vulnerabilities.

**These are not security boundaries yet:**
- Share links, roles and "require sign-in" are only enforced in this browser. Real access control needs the server.
- Local data isn't encrypted; anyone with access to the browser profile can read it.

## Keyboard shortcuts

Press `?` on any board, or see `/help`.

| Action | Keys |
| ------ | ---- |
| Select, hand | V, H |
| Rectangle, diamond, ellipse | R, D, O |
| Arrow, line, pencil | A, L, P |
| Text, sticky note | T, N |
| Image, eraser, laser | I, E, K |
| Lock tool after drawing | Q |
| Undo, redo | Ctrl Z, Ctrl Shift Z |
| Cut, copy, paste, duplicate | Ctrl X, Ctrl C, Ctrl V, Ctrl D |
| Group, ungroup | Ctrl G, Ctrl Shift G |
| Select all, delete | Ctrl A, Del |
| Nudge | Arrow keys (Shift for 10px) |
| Zoom in, out, reset | Ctrl +, Ctrl −, Ctrl 0 |
| Zoom to fit, to selection | Shift 1, Shift 2 |
| Grid and snapping | Ctrl ' |
| Board outline | Alt O |
| Open, save | Ctrl O, Ctrl S |

## What remains

These items come from the project brief and the real-world comparison above.

**Backend (the largest piece)**
- [ ] Real-time sync server (WebSocket) with batching and reconnection.
- [ ] A CRDT for the board, e.g. Yjs, which gives conflict-free merging and offline edits that merge on reconnect.
- [ ] Persistence as snapshots plus an operation log, and version snapshots that can be restored.
- [ ] Accounts and authentication: magic-link email and OAuth (Google, GitHub, Facebook).
- [ ] A permission check on every message, with owner, editor and viewer roles and expiring share links enforced server-side.
- [ ] Horizontal scaling with a message broker, e.g. Redis pub/sub.
- [ ] Image storage outside the board document, e.g. object storage, so images don't count against browser storage.

**Collaboration features (frontend, need the backend)**
- [ ] Live cursors and presence, the "typing" labels, and join/leave toasts.
- [ ] Per-user undo and redo on top of the CRDT, undoing only your own operations.
- [ ] A view-only mode for viewers, sending invite emails, comments and threads, and "Shared with me".
- [ ] Cross-device boards (currently they live in the browser that made them).

**Performance and graphics**
- [ ] A spatial index (e.g. R-tree or grid) for culling and hit-testing, to stay smooth at 10,000 objects (culling is currently a linear scan).
- [ ] Only redraw what changed and cache static layers, with web-worker export for large boards.

**Remaining editor features (from the comparison)**
- [ ] Rotation and flip.
- [ ] Frames, lasso selection, embeds, elbow (orthogonal) connectors and shape-to-shape snapping.
- [ ] The hand-drawn "sloppiness" style, dark mode, and find on canvas.
- [ ] A one-handed tool palette for phones, and a first-run tour (onboarding in under a minute).

**Product pages**
- [ ] Pricing and billing once paid plans exist; about, blog and changelog if needed.

**Testing and the demo**
- [ ] Unit tests for the engine (geometry, validation, bindings, history) and end-to-end tests for the main flows.
- [ ] An automated test with 20 simulated clients drawing and deleting for five minutes with random disconnects, ending with a check that every client's board is identical.

**Stretch goals**
- [ ] Live voice chat, or a replay mode that plays back a session.

## Reference: Excalidraw

[Excalidraw](https://github.com/excalidraw/excalidraw) (MIT) is our architectural reference; SketchSync's engine is our own code. To read it, clone it next to this repo:

```bash
git clone --depth 1 https://github.com/excalidraw/excalidraw.git ../excalidraw-reference
```

Useful places: `packages/excalidraw/` (editor, actions, history), `packages/element/` (element model, hit-testing, bounds, arrow binding) and `excalidraw-app/collab/` (real-time collaboration).
