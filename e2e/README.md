# Browser tests

End-to-end checks that drive real browsers against a running SketchSync. Each user is a separate browser session (separate cookies).

| Script | What it checks |
| --- | --- |
| `multiuser.mjs` | Owner, guest viewer (invite link) and signed-in editor on one board: view-only mode, live edits both ways, viewers can't draw, named cursors, version restore, an offline edit merging on reconnect, identical boards at the end, and a turned-off link removing the guest |
| `scratch-canvas.mjs` | Visiting two boards and leaving leaves the private scratch canvas untouched, and each board keeps its own shapes |
| `two-servers.mjs` | With two server processes sharing Redis: an edit on one reaches clients on the other, each process's board includes the other's edits, and turning off a link on one disconnects a guest on the other |

Run against the dev server (`http://localhost:3001`, the default) or the Docker stack:

```bash
cd server && npm run seed:dev          # demo accounts, once
node e2e/multiuser.mjs                 # or: node e2e/multiuser.mjs http://localhost:8080
node e2e/scratch-canvas.mjs
```

`two-servers.mjs` talks to two server processes directly:

```bash
docker compose up -d --scale server=2
docker compose ps server               # note the two 127.0.0.1 ports
node e2e/two-servers.mjs http://127.0.0.1:3002,http://127.0.0.1:3003
```

The browser scripts need the dev build's test hooks (`window.h`, `window.collab`), so against the Docker production build only the API-level steps work. Use the dev server.

They use the `playwright` package from the repo's dev dependencies. If its Chromium isn't downloaded, run `npx playwright install chromium`, or point `CHROMIUM_PATH` at an existing Chromium or headless shell.
