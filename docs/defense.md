# Questions the group must defend

Short answers with pointers to the details.

## Why did you choose a CRDT or operational transformation, and what did you give up?

**A state-based CRDT: a last-writer-wins register per element.** Each shape has a `version` (bumped on every change) and a random `versionNonce`. When two copies meet, the higher version wins, and on a tie the lower nonce wins. The server and every client apply exactly the same rule.

Why:

- It's **order-independent and idempotent**, so messages can arrive late, out of order, twice, or after hours offline, and everyone still ends up identical. That makes retries and offline merging simple and safe.
- No central transform logic for every kind of operation, as OT needs.
- The editor's client already worked this way, so we built on tested code instead of replacing it.

What we gave up:

- **Concurrent edits to the same shape don't combine.** One user's version of the whole shape wins. A move and a recolour of the same shape at the same moment keep only one of the two.
- **Text inside one text element isn't merged character by character.** Two people typing in the same text box: the last full version wins.
- **Deleted shapes must be remembered for a while** (30 days); see [sync-protocol.md](sync-protocol.md).

## Two users move and delete the same shape at the same moment. What happens, and why is that the right result?

Both start from the same version, say 5. Dragging bumps the version on every pointer move, so the mover quickly reaches 6, 7, 8 and more. The delete is one change, to 6. **Usually the move wins and the shape stays where the mover left it.** If both land on exactly the same version, the random nonce decides: arbitrary, but **identical on every client and on the server**.

Why it's right:

1. **Everyone converges on the same board.** Nobody sees a shape that someone else doesn't.
2. Keeping the shape is the safer mistake. A shape that should have gone can be deleted again in one keystroke; a shape that vanished mid-drag would surprise the person dragging it.
3. Nothing is unrecoverable. The deleter can delete it again, either user can undo, and version history keeps snapshots.

This is a server test: "equal versions are settled by the lower versionNonce, like the client".

## What does "undo" mean when someone else has changed the object since you made your edit?

**Undo only undoes your own changes.** Changes from others never enter your undo history (they're applied with `CaptureUpdateAction.NEVER`).

Undo applies the **inverse of your change to the current state of the object**, as a new edit that syncs to everyone like any other.

- If the other person changed **different properties**, both survive. You moved the box and they recoloured it: your undo moves it back and their colour stays.
- If they changed **the same property after you**, your undo sets it back to what it was before your edit, overwriting theirs. That is a new, visible change, and they can undo it in turn.

We chose this over "undo whatever happened last on the board", which would let you silently erase other people's work.

## How does the board stay smooth with 10,000 objects and a slow connection?

**Drawing:**

- A **spatial index** (a uniform grid) finds the shapes in view instead of checking all 10,000 every frame. At 10,000 shapes this went from 2.3 ms to 0.06 ms, and a whole renderer step while panning from 4.1 ms to 0.07 ms. The index updates incrementally, only for shapes whose version changed. See [performance.md](performance.md).
- The editor's own tricks stay in place: each shape's drawing is cached, and rendering is throttled to animation frames.
- The **minimap** draws simplified boxes on a small canvas and redraws only when something changed.

**Network:**

- **Only changed shapes are sent**, at most every 50 ms. Only one message waits for the server's reply at a time, and anything changed meanwhile goes out in the next one. **On a slow connection, batches grow instead of a queue of stale messages building up.**
- The server relays only shapes that actually won the merge, never the sender's own echo.
- WebSocket compression (permessage-deflate). Shape JSON compresses well.
- Cursors are "volatile": if the connection is slow they're dropped, never queued.
- We removed the editor's "re-send the whole board every 20 seconds", which on a 10,000-shape board meant megabytes per user. Server acknowledgements plus retries replace it.
- Joining sends the board once from the server's memory. After a reconnect, only the differences go up.
