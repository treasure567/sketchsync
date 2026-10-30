# SketchSync

A collaborative whiteboard for lecturers, study groups and teams: sketch, diagram and wireframe on phones and laptops, with no install and on poor connections.

> **Status:** the frontend is complete and works fully **in a single browser**. Boards, profile and library are stored locally (`localStorage`). Real-time collaboration, accounts and cross-device sync need the backend, which has not been built yet. See [What remains](#what-remains).

## Contents

- [Features](#features)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [How the whiteboard works](#how-the-whiteboard-works)
- [Data storage](#data-storage)
- [Security](#security)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [What remains](#what-remains)
- [Reference: Excalidraw](#reference-excalidraw)

## Features

### Landing page (`/`)

Hero with a live board illustration, feature sections (tools, sharing, offline, quick sketch), testimonials, call to action and footer. "Start sketch for free" opens a new board and "Try a demo" opens the flowchart template.

### Sign up and sign in (`/signup`, `/signin`)

- A testimonial carousel beside the auth card.
- The passwordless email flow: enter an email, then "Check your email" with a resend countdown and an "Open email app" button that opens the matching webmail. An expired link is shown at `/signin?link=expired`.
- Google, GitHub and Facebook buttons currently go straight to the dashboard. No real authentication happens yet.

### Dashboard (`/dashboard`)

- Boards with live thumbnails, element counts, last-edited times and stars.
- Rename, duplicate, move to trash, restore, and delete forever.
- Filters (all, created by me, shared, recent, starred, trash), search, sort, and grid or list view.
- Templates (Blank, Brainstorm, Lecture Notes, Flowchart) create pre-filled boards; a templates library dialog previews them all.
- A free-plan usage meter, a mobile sidebar drawer, and an empty state for new users.

### Whiteboard (`/board/:id`)

- **Tools:** select, hand, rectangle, diamond, ellipse, arrow, line, pencil, text, sticky note and eraser, plus a tool lock.
- **Infinite canvas:**
  - pan with the hand tool, Space+drag, the middle button or the wheel;
  - zoom with Ctrl+wheel, the buttons or a two-finger pinch.
- **Selection:**
  - click, Shift-click, or drag a box;
  - move and resize with handles (Shift keeps proportions), with a size badge;
  - lock elements in place;
  - right-click for actions.
- **Style panel:**
  - stroke and background colours (with a custom picker);
  - solid, hatch or cross fill; stroke width; solid, dashed or dotted lines;
  - rounded or sharp edges, and opacity;
  - layer order, duplicate, lock, add to library and delete.
- **Pencil:**
  - smoothed curves;
  - **pressure-sensitive width** (pen pressure, or simulated from speed for a mouse or finger);
  - **palm rejection** (touches are ignored just after pen input).
- **History and clipboard:** undo and redo (a whole drag is one step); cut, copy and paste between boards; duplicate.
- **Library panel:** six built-in pieces plus your own saved selections. Add them by clicking or dragging onto the canvas, and search them.
- **Minimap:** click or drag it to move around the board.
- **Share dialog:**
  - share link with a 128-bit token, default role, expiry countdown and a sign-in requirement;
  - disable or re-create the link;
  - an invite list.
- **Main menu:**
  - open, or save to a `.json` file;
  - **export to PNG (2×), SVG and PDF**;
  - clear the canvas, and the shortcuts dialog.
- **Board extras:** an editable title, autosave with a save indicator, a welcome screen on empty boards, and a hint for each tool.

### Account settings (`/settings`)

- Profile with avatar upload (cropped and downscaled), validated name, email, handle and role, and save or cancel.
- Your **live cursor colour** (used for selections on boards) and **freehand ink** setting (fixed, pressure or bold pencil default), with a live preview.
- Board usage, and a danger zone that wipes all SketchSync data on the device.

## Getting started

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # type-check and build apps/web to apps/web/dist
pnpm lint       # oxlint across the workspace
pnpm preview    # serve the production build (http://localhost:4173)
```

### Configuration

| Variable        | Default                  | Purpose                                                             |
| --------------- | ------------------------ | ------------------------------------------------------------------- |
| `VITE_SITE_URL` | `https://sketchsync.dev` | Public address used for absolute URLs in link-preview (Open Graph) tags |

Copy `apps/web/.env.example` to `apps/web/.env` to override it, or set it when building.

### Deploying

`apps/web/dist` is a static single-page app:
- Serve `index.html` for all routes that don't match a file, so deep links like `/board/<id>` work.
- If possible, also send the Content Security Policy from `index.html` as an HTTP header, and add `frame-ancestors 'none'`.

## Project structure

The repository is a pnpm workspace. The sync server will live in `apps/server` and shared code in `packages/`.

```
apps/web/
  public/                 favicon, app icons, manifest, Open Graph image, robots.txt
  src/
    lib/board/            whiteboard engine (no React)
      types.ts            element, style and camera types
      geometry.ts         bounds, hit-testing, camera maths, resize handles
      elements.ts         element factories and strict validation of stored/imported data
      render.ts           canvas renderer (styles, pressure strokes, selection, handles)
      actions.ts          duplicate, delete, lock, restyle, layer order
      clipboard.ts        cross-board clipboard
      library.ts          built-in and user library items
      builders.ts         helpers for composing ready-made elements
      export.ts           PNG, SVG and PDF export
      storage.ts          board file format (open / save)
      text.ts             text measuring and wrapping
    lib/boards/           board index (metadata, share settings) and templates
    lib/profile.ts        user profile, avatar processing, local data wipe
    hooks/                useBoardHistory (undo/redo), useBoards, useProfile, …
    components/
      board/              canvas, toolbar, style panel, library, minimap, dialogs, editor
      dashboard/          sidebar, top bar, board cards, templates
      landing/            landing page sections and illustrations
      auth/               sign-up / sign-in cards and layout
      settings/           account settings
      ui/                 shared button, menu, dialog, avatar, keyboard hint
    pages/                one component per route (lazy-loaded, except the landing page)
```

## How the whiteboard works

The engine lives in `src/lib/board` and doesn't use React, so it can be tested on its own and later driven by a sync layer.

- **Model:** a board is an ordered array of elements in world coordinates. Array order is draw order.
- **Rendering:** each frame is drawn to an HTML canvas at the device's pixel ratio. Elements outside the viewport are skipped (bounding-box culling).
- **Camera:** a world point `p` appears on screen at `(p - camera) * zoom`. Zoom keeps the point under the cursor or between the fingers fixed.
- **Hit-testing:** this is done per shape. Filled shapes count their inside; unfilled shapes count only their outline; lines and strokes use distance to their segments.
- **Input:** a single pointer-event state machine handles pan, pinch, move, resize, marquee, create, draw and erase. Mouse, pen and touch share the same code.
- **History:** a gesture works as begin, then many updates, then commit, which becomes one undo step, and a gesture can also be cancelled. History currently stores whole snapshots and is per tab.
- **Saving:** each board autosaves 400 ms after the last change, and immediately when the page is closed.

## Data storage

Everything is stored in the browser's `localStorage`:

| Key                                  | Contents                                          |
| ------------------------------------ | ------------------------------------------------- |
| `sketchsync:boards`                  | board index: names, types, stars, trash, share settings |
| `sketchsync:board-content:<id>`      | a board's elements                                |
| `sketchsync:library`                 | your saved library items                          |
| `sketchsync:clipboard`               | the last copied elements                          |
| `sketchsync:profile`                 | name, email, handle, role, avatar, cursor colour, ink setting |

The dashboard listens for storage events, so open tabs stay in sync. Board changes re-read the stored index before writing, so one tab can't overwrite another tab's changes.

## Security

The frontend has no server yet, so the main risks are untrusted input (opened files, stored data) and the browser environment.

- **Strict validation:** every element read from storage, opened files, the clipboard or the library is rebuilt field by field. Numbers must be finite, types are known, colours must be hex or `transparent`, and text, point counts, sizes and opacity are capped. A malformed or hostile file can't crash a board or inject markup.
- **Safe exports:** SVG export also XML-escapes text and colours. Files over 20 MB are refused.
- **Share tokens:** 128-bit tokens from `crypto.getRandomValues`. `/b/:id` only opens while the link is enabled, unexpired and the token matches.
- **Content Security Policy:** production builds only allow the site's own scripts, styles, fonts and images (`data:`/`blob:` images are allowed for avatars and exports), with a strict referrer policy.
- **No HTML injection:** there's no `innerHTML`, `eval` or `dangerouslySetInnerHTML`, and React escapes all user text. External links use `rel="noreferrer"`.
- **Clean audit:** `pnpm audit` reports no known vulnerabilities.

**These are not security boundaries yet:**
- Share links, roles and "require sign-in" are only enforced in this browser. Real access control needs the server.
- Local data isn't encrypted; anyone with access to the browser profile can read it.

## Keyboard shortcuts

Press `?` on any board for the full list.

| Action | Keys |
| ------ | ---- |
| Select, hand | V, H |
| Rectangle, diamond, ellipse | R, D, O |
| Arrow, line, pencil | A, L, P |
| Text, sticky note, eraser | T, N, E |
| Lock tool after drawing | Q |
| Undo, redo | Ctrl Z, Ctrl Shift Z |
| Cut, copy, paste, duplicate | Ctrl X, Ctrl C, Ctrl V, Ctrl D |
| Select all, delete | Ctrl A, Del |
| Zoom in, out, reset | Ctrl +, Ctrl −, Ctrl 0 |
| Open, save | Ctrl O, Ctrl S |

## What remains

These items come from the project brief.

**Backend (the largest piece)**
- [ ] Real-time sync server (WebSocket) with batching and reconnection.
- [ ] A CRDT for the board, e.g. Yjs, which gives conflict-free merging and offline edits that merge on reconnect.
- [ ] Persistence as snapshots plus an operation log, and version snapshots that can be restored.
- [ ] Accounts and authentication: magic-link email and OAuth (Google, GitHub, Facebook).
- [ ] A permission check on every message, with owner, editor and viewer roles and expiring share links enforced server-side.
- [ ] Horizontal scaling with a message broker, e.g. Redis pub/sub.

**Collaboration features (frontend, need the backend)**
- [ ] Live cursors and presence, the "Elena typing…" labels, and join/leave toasts.
- [ ] Per-user undo and redo on top of the CRDT, undoing only your own operations.
- [ ] A view-only mode for viewers, sending invite emails, comments and threads, and "Shared with me".
- [ ] Cross-device boards (currently they live in the browser that made them).

**Performance and graphics**
- [ ] A spatial index (e.g. R-tree or grid) for culling and hit-testing, to stay smooth at 10,000 objects (culling is currently a linear scan).
- [ ] Only redraw what changed and cache static layers, with web-worker export for large boards.

**Remaining editor features**
- [ ] Rotation, connectors that stay attached to shapes, the image tool, and the hand-drawn "sloppiness" style.
- [ ] A one-handed tool palette for phones, and an accessible text alternative for non-visual users.
- [ ] Onboarding in under a minute: a guided first-run tour.

**Testing and the demo**
- [ ] Unit tests for the engine (geometry, validation, history) and end-to-end tests for the main flows.
- [ ] An automated test with 20 simulated clients drawing and deleting for five minutes with random disconnects, ending with a check that every client's board is identical.

**Stretch goals**
- [ ] Live voice chat, or a replay mode that plays back a session.

## Reference: Excalidraw

[Excalidraw](https://github.com/excalidraw/excalidraw) (MIT) is our architectural reference; SketchSync's engine is our own code. To read it, clone it next to this repo:

```bash
git clone --depth 1 https://github.com/excalidraw/excalidraw.git ../excalidraw-reference
```

Useful places: `packages/excalidraw/` (editor, actions, history), `packages/element/` (element model, hit-testing, bounds) and `excalidraw-app/collab/` (real-time collaboration).
