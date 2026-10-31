# Operation log, snapshots and version history

## Persistence: snapshot + operation log

Every accepted change is stored as one row in `board_ops`: the elements that changed, who changed them, and when. A global `seq` number orders the rows. The board itself keeps a **snapshot**, the compacted element list up to `snapshot_seq`.

```
current board = merge(boards.snapshot, every board_ops row with seq > snapshot_seq)
```

- **Writes are cheap and durable.** An edit is one small insert, group-committed with other edits arriving at the same moment, and the client is only acknowledged after it is stored.
- **Loading is quick.** The server reads one snapshot plus the ops since then, not the whole history.
- **Compaction** folds ops into a new snapshot after every 500 ops (`OPS_PER_COMPACTION`), and when a board has had nobody on it for a minute. It runs in a transaction with a per-board advisory lock, so two server processes never compact the same board at once.
  - It only folds ops older than 10 seconds. A `seq` number is taken when a row is inserted, so a slow insert could commit a lower number after a higher one is already visible. Waiting avoids skipping it.
  - Deleted elements older than 30 days are dropped from the snapshot.
- **Ops are kept after compaction**, so a session can be replayed later (the brief's stretch goal).

The live board lives in the server's memory while people are on it. Several server processes keep their copies in step through Redis, and because the merge rule doesn't care about order (see [sync-protocol.md](sync-protocol.md)), it doesn't matter which process hears about a change first.

## Version history

Open it from **Main menu → Version history**, the **Version history** button in the Share dialog, or the command palette.

- **Automatic snapshots**: a version is saved during compaction if the last one is more than 30 minutes old (`AUTO_VERSION_INTERVAL_MS`). So an actively edited board gets a version about every 30 minutes, and every board gets one shortly after the last person leaves.
- **Named versions**: editors can save one at any time with an optional name, e.g. "Before the exam review".
- **Preview**: anyone with access can preview a version, rendered with the editor's own SVG export.
- **Restore** (editors and owners):
  1. The current board is saved first as a "Before a restore" version, so a restore can itself be undone.
  2. The restore is applied as a **new edit**. Elements that differ from the version are put back with a higher `version` number; elements added since are marked deleted; elements deleted since come back.
  3. Everyone on the board receives it live, like any other change. Nobody's client is "rewound", so there's nothing to get out of sync.

## API

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/api/boards/:id/versions` | viewer |
| `GET` | `/api/boards/:id/versions/:versionId` | viewer (returns the elements) |
| `POST` | `/api/boards/:id/versions` `{ label }` | editor |
| `POST` | `/api/boards/:id/versions/:versionId/restore` | editor |

## Tests

`server/test/server.test.ts`:

- "the board survives everyone leaving, compaction and a reload" checks the op log, the snapshot and loading.
- "restoring a version is a new edit that every client receives" checks the version numbers after a restore, deleted elements, and the "before restore" version.

The browser test clears a board from one client, restores a version from another, and checks all three clients get the shapes back.
