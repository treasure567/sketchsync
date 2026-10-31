# Editing offline

The brief asks for "editing offline, then merging when the connection returns". Three things make that work.

## 1. The app loads without a connection

The app's service worker (PWA) caches the app after the first visit, so `https://<your domain>/` opens offline. The local scratch canvas has always worked offline; it lives in the browser's storage.

## 2. Boards are kept on the device

While you're on a board, the app saves it to IndexedDB about once a second (`app/data/boardCache.ts`). It also saves when you leave the page. Images you've seen are cached too, so they show offline.

When you open a board:

- **Online:** the board appears from the cache straight away, then the server's copy is merged in.
- **Offline:** the board link still opens, from the cache. Your role is remembered from the last visit.

## 3. Changes merge when the connection returns

While offline you keep drawing. Nothing is lost or blocked: the app just doesn't send. A small warning says the connection dropped and that your changes are kept on this device.

When the connection comes back, Socket.IO reconnects by itself and the server sends its current board. The app then:

1. merges the server's board into yours with the CRDT rule, so other people's changes appear;
2. sends every element where your copy is newer than the server's, i.e. your offline edits.

The same happens if you closed the tab while offline: the next time you open the board, the cached copy is merged with the server's and your offline edits are sent.

Conflicts are settled the same way as live edits; see [sync-protocol.md](sync-protocol.md). If you and someone else changed the same shape, the copy with more changes on it wins.

## Limits

- Images added while offline upload once you're back online. Until then, others see a placeholder.
- If your access was removed while you were offline, your offline edits are refused when you reconnect, and you're told why.
- Deleted shapes are remembered for 30 days. Someone offline for longer, still holding an old copy of a shape that was deleted, would bring it back.

## How it was tested

The browser test (owner, editor and viewer in separate browser sessions) cuts the editor's network, draws on both sides, and restores the network. It then checks that every client ends with the identical board.
