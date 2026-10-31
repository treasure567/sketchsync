# Sync protocol

How every participant ends up with the same board, even when edits collide, messages are lost or someone goes offline.

## CRDT, not OT

A board is a set of elements (shapes, arrows, text, images), each with an id. We treat it as a **state-based CRDT: a last-writer-wins register per element**.

- Every element carries `version` (bumped on every change) and `versionNonce` (a random number picked on every change).
- To merge two copies of an element, **the higher `version` wins; if versions are equal, the lower `versionNonce` wins.**
- Deleting is a change too: `isDeleted: true` with a higher version (a "tombstone"), so deletes merge like any other edit.
- Z-order uses fractional indices (`index`), so reordering is also just a property change on one element.

This is the rule SketchSync already uses (`shouldDiscardRemoteElement` in `packages/editor/data/reconcile.ts`). The server applies the exact same rule (`server/src/elements.ts`, `isNewer`). Because the rule is commutative, associative and idempotent, the order in which updates arrive doesn't matter, and receiving one twice is harmless. That is what lets us retry freely and merge offline work.

**Why not operational transformation (OT)?** OT transforms each operation against concurrent ones and needs a central sequencer and a server-side transform for every operation type. For a whiteboard, where edits are mostly "replace this shape's properties", a per-element CRDT is far simpler, works offline by design, and is what the editor's client already does.

**What we gave up:**

- Concurrent edits to _different properties of the same element_ don't combine: one user's whole element wins. Moving a shape while someone recolours it keeps only one of the two changes.
- Text inside one text element is last-writer-wins too, not merged character by character as Google Docs does.
- Tombstones must be kept for a while (30 days by default, `DELETED_ELEMENT_RETENTION_DAYS`). A client that was offline for longer than that could bring a deleted element back.

## Messages

All over Socket.IO, with permessage-deflate compression for anything over 1 KB.

| Direction | Event | Payload | Notes |
| --- | --- | --- | --- |
| S → C | `init-room` |  | on every (re)connect |
| C → S | `join-room` | `boardId` | invite token travels in the handshake `auth` |
| S → C | `access` | `{ role, linkExpiresAt }` | on join and whenever access changes |
| S → C | `client-broadcast` | `SCENE_INIT { elements }` | the whole board, from the server's memory |
| C → S | `server-broadcast` | `boardId, SCENE_UPDATE { elements }`, ack | only elements that changed |
| S → C | ack | `{ ok }` or `{ ok: false, error }` | `read_only`, `forbidden`, `server_error` |
| S → C | `client-broadcast` | `SCENE_UPDATE { elements }` | only elements that won the merge |
| C → S → C | `server-volatile-broadcast` | cursor, idle state, viewport | may be dropped; the server stamps the real sender id and name |
| S → C | `room-user-change` | socket ids | presence |
| S → C | `access-denied`, `access-revoked` | reason | then the server disconnects |

## What happens to one edit

1. You drag a shape. The editor bumps its `version`. At most every 50 ms, the app collects every element whose version is higher than the last one it sent, and emits them with an ack callback.
2. The server checks your access for this message (see [permissions.md](permissions.md)), merges the elements into the board held in memory, and keeps only the ones that are actually newer.
3. Those elements are appended to the operation log. Writes are **group-committed**: while one insert is in flight, new ops queue up and go out together in the next insert.
4. Only after the write succeeds does the server relay the accepted elements to everyone else and ack you. **An ack means your change is stored.**
5. If the ack fails or times out (10 s), the app rolls back its "sent" marker for those elements and sends them again later, with a retry every 20 s. Since merging is idempotent, a duplicate is harmless.
6. Receivers merge with the same rule and record the versions, so they don't echo them back.

## Reconnection

Socket.IO reconnects automatically. On every reconnect the server sends `SCENE_INIT` with the full board. The app then:

1. merges the server's board into what it has;
2. takes the server's versions as the new baseline;
3. sends every element it holds with a higher version than the server's. These are edits made while disconnected.

No full-board upload is needed. Only the difference goes up.

## Batching and bandwidth

- **Client batching:** scene changes go out at most every 50 ms (the editor sent one per rendered frame, up to 60 a second while dragging). Only one scene message waits for an ack at a time; anything changed meanwhile goes out together right after. **On a slow connection the batches simply grow**, instead of a queue of stale messages building up. Cursor updates are separate, volatile (droppable) and capped at about 30 per second.
- **Server:** relays only elements that changed the board, never the sender's echo; group-commits log writes.
- **Wire:** permessage-deflate compression; element JSON compresses well.
- **We removed** the editor's "send the whole board every 20 seconds" safety net, which on a 10,000-element board meant megabytes per user every 20 s. Acks and retries replace it.

## Two users move and delete the same shape at the same moment

Both start from version 5. A drag bumps the version on every pointer move, so the mover usually reaches 6, 7, 8 and more, while the delete is a single bump to 6. **The move usually wins and the shape survives.** We think that's right: the mover has done more recent work, and a deleted shape is easy to delete again but hard to recreate.

If both land on exactly the same version, the lower random `versionNonce` decides. That choice is arbitrary but the same on every client and on the server, so **everyone ends up with the same board**. The loser's change isn't silently lost from history: they can still undo or redo locally, and the version history has snapshots.

Tested in `server/test/server.test.ts`: "equal versions are settled by the lower versionNonce, like the client".

## Undo when someone else changed the object

Undo is **per user**. The editor records only your own changes in your history; changes that arrive from others are applied with `CaptureUpdateAction.NEVER`, so they never enter your undo stack.

Undo applies the _inverse of your change_ to the **current** element, as a new edit with a higher version. Suppose you moved a box and then someone recoloured it. Your undo moves it back but keeps their colour, because your change only touched position. If they changed the same property after you, your undo overwrites their value with yours from before. That's a new edit, so it syncs and can itself be undone.

## Where to look

- Client: `app/collab/Collab.tsx`, `app/collab/Portal.tsx`
- Server: `server/src/collab.ts`, `server/src/rooms.ts`, `server/src/elements.ts`
- Tests: `server/test/server.test.ts` (live sync, permissions, persistence)
