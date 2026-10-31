# Progress log

Newest first. Each entry says what changed and where to read more.

## 2026-10-31: the missing features

Built everything the brief needs that the starting editor lacked, except the 20-client automated test (postponed by the team).

**Key decision: boards are no longer end-to-end encrypted.** The editor encrypted rooms in the browser with a key in the link, so the server can't read them. That rules out most of the brief's server requirements: per-message permission checks, the operation log, snapshots and version restore. The server now holds each board, and access comes from accounts, roles and invite links. Traffic is protected by HTTPS. See [architecture.md](architecture.md).

Server (`server/`):

- Accounts with scrypt passwords and hashed session tokens; rate-limited sign-in; cross-site write protection. See [permissions.md](permissions.md).
- Boards with owner, editor and viewer roles; invite links with expiry; members added by email.
- **Permission check on every Socket.IO message.** Access changes reach open connections straight away, including link expiry, revocation and role changes, across server processes.
- The server holds open boards in memory and merges with the same rule as the clients.
- Operation log with group-committed writes; snapshot compaction; acks sent only after a change is stored. See [versions.md](versions.md).
- Version history: automatic every 30 minutes of activity, named versions, restore as a new edit.
- Redis adapter plus cross-process board sync, for scaling out. See [deployment.md](deployment.md#scaling-out).
- 15 integration tests against a real Postgres (`npm test`).

App (`app/`):

- New sync client: plain messages, acks and retries, 50 ms batching with one message in flight, reconnect merge. See [sync-protocol.md](sync-protocol.md).
- Offline: boards cached in IndexedDB; open, edit and merge on reconnect. See [offline.md](offline.md).
- New screens: sign-in, My boards, board sharing (invite links with QR, people and roles), version history with preview, board badge.
- Rebranded to SketchSync with the team's logo and icons from the `frontend` branch. Removed the paid-plan links, socials, analytics and promos; AI features are off unless configured.

Editor features, built by helper agents in parallel:

- Spatial index for rendering: visible-shape lookup 2.3 ms → 0.06 ms at 10,000 shapes. See [performance.md](performance.md).
- PDF export and a minimap. See [export.md](export.md) and [minimap.md](minimap.md).
- Accessible board outline, a one-minute tour, and a one-handed phone layout. See [accessibility.md](accessibility.md), [onboarding.md](onboarding.md) and [mobile.md](mobile.md).

Checked with a browser test of three users in separate sessions (owner, guest viewer, signed-in editor):

- the viewer joins in view mode and can't draw;
- edits reach everyone, and cursors show account names;
- restoring a version brings deleted shapes back for all;
- an offline edit merges on reconnect;
- all three end with identical boards;
- turning off a link removes the guest with a message.

More checks (all passing):

- **Scratch canvas:** visiting two boards and leaving leaves the private scratch canvas untouched. This caught and fixed a bug where switching boards could save one board over it.
- **Two server processes sharing Redis:** edits, in-memory board state and link revocation all cross between processes.
- **Production build, offline:** a board reopens offline from the device cache, and an edit made offline reaches the server on reconnect.
- **Unit and integration tests:** the full repo suite passes (2,713 tests in 156 files), plus 15 server integration tests, with no TypeScript errors.

Browser tests live in [`e2e/`](../e2e/README.md).

Not built:

- email verification and password reset (need an email provider);
- sign-in with Google or GitHub (needs OAuth credentials);
- the 20-client test;
- the stretch goals (voice chat, session replay).

The operation log is kept so replay can be added later.

## 2026-10-31: self-hosted editor

- Started from an open-source whiteboard editor and replaced its hosted services (collaboration relay, Firebase storage, share-link server) with our own server in `server/`, backed by Postgres and Redis.
- Removed the export to a third-party paid service.
- Added Docker Compose for the whole stack, with an optional Caddy for HTTPS on the VPS.
- Tested live collaboration, image sync and reloading from the database in two browser tabs.
