# Architecture

SketchSync is an open-source whiteboard editor and web app, plus our own server. This page shows how the pieces fit and what we changed.

## The pieces

```
browser ──https──▶ caddy (TLS, VPS only) ──▶ web (nginx)
                                               ├── /            built app (static files, PWA)
                                               ├── /api/*       ──▶ server ──▶ postgres
                                               └── /socket.io/* ──▶ server ◀─▶ redis
```

| Piece | Where | Job |
| --- | --- | --- |
| Editor | `packages/` | The canvas, tools, undo history, export. Mostly as we found it; we added a spatial index and PDF export. |
| App | `app/` | The web app around the editor: boards, sign-in, sharing, version history, offline cache, minimap, outline, tour. |
| Server | `server/` | Node 24, Express and Socket.IO. Holds every open board in memory, checks permissions on every message, writes an operation log to Postgres. |
| Postgres | Docker | Users, sessions, boards, members, invite links, the operation log, snapshots, versions, images. |
| Redis | Docker | Lets several server processes share rooms (Socket.IO Redis adapter) and pass each other board changes. |
| nginx | `deploy/nginx.conf` | Serves the app and forwards `/api` and `/socket.io` to the server. |
| Caddy | `deploy/Caddyfile` | HTTPS certificates on the VPS. |

## Data model

| Table | What's in it |
| --- | --- |
| `users` | email (lowercased), name, scrypt password hash |
| `sessions` | SHA-256 of each session token, expiry (30 days) |
| `boards` | title, owner, `snapshot` (compacted elements) and `snapshot_seq` |
| `board_members` | `(board, user, role)`, where role is `owner`, `editor` or `viewer` |
| `board_links` | invite tokens with a role, optional expiry, and a revoked flag |
| `board_ops` | the operation log: one row per accepted change, with a global `seq` |
| `board_versions` | named and automatic versions (full element lists) |
| `files` | images, stored under `rooms/<boardId>` |
| `share_links` | The editor's read-only "Export → Shareable link" snapshots (still end-to-end encrypted) |

**The current board = `boards.snapshot` + every `board_ops` row with a higher `seq`, merged with the rule in [sync-protocol.md](sync-protocol.md).** Compaction folds old ops into the snapshot; see [versions.md](versions.md).

## Why we dropped end-to-end encryption for boards

Out of the box, the editor encrypts a room in the browser with a key that lives in the link (`#room=id,key`). The server only relays bytes it can't read. That's good for privacy, but it rules out most of the brief:

- **Permission checks on every message.** The server can't tell an edit from a cursor move if it can't read the message.
- **Operation log, snapshots and version restore** need the server to read and merge boards.
- **Expiring links.** If the key is the link, anyone who saw it once can keep reading anything they recorded.

So boards are now plain JSON on the server. Access is controlled by accounts, roles and invite tokens, which the server checks. Traffic is protected by HTTPS. The read-only "shareable link" export keeps its end-to-end encryption, because it needs none of those features.

Images are still encrypted with a per-board key that the server hands out to people with access. This kept the editor's image pipeline unchanged. It isn't a security boundary, because the image endpoint checks access anyway.

## What we changed in the editor and app

| Area | Change |
| --- | --- |
| `app/collab/Collab.tsx`, `Portal.tsx` | Plain messages instead of encrypted ones; server acknowledgements and retries; the server sends the board on join; reconnect merging; offline cache; access events (`access`, `access-denied`, `access-revoked`). |
| `app/data/fileStorage.ts` | Now only uploads and downloads images to our server. The scene functions are gone. |
| `app/data/sketchsyncApi.ts`, `boardCache.ts` | New: API client, current user and board state, offline IndexedDB cache. |
| `app/data/index.ts` | Board links are `#board=<id>` or `#board=<id>&invite=<token>`. |
| New UI | `AccountDialog`, `BoardsDialog`, `share/BoardShareDialog`, `VersionHistoryDialog`, `BoardBadge`, `AccountMenuItems`. |
| Branding | SketchSync name, logo and icons (from the team's `frontend` branch). Removed the paid-plan links, socials, analytics, the encryption badge and sidebar promos. AI features are off unless `VITE_APP_AI_BACKEND` is set. |
| Editor packages | Spatial index in the renderer ([performance.md](performance.md)), PDF export ([export.md](export.md)), mobile layout ([mobile.md](mobile.md)). |
