# SketchSync

A real-time collaborative whiteboard for lecturers and study groups. It works on phones and laptops, on poor connections, with no installation. The drawing editor is open source (MIT, see [LICENSE](LICENSE)); the server and everything around boards is ours.

- **Live boards** with everyone's cursors, synced through our server. Nobody's work is lost when edits collide.
- **Accounts and roles**: owner, editor, viewer. **Invite links** that expire (1 hour to never), with a QR code for the projector.
- **Version history**: automatic snapshots and named versions, with preview and restore.
- **Offline editing**: boards are cached on the device and merge when the connection returns.
- **Export** to PNG, SVG and PDF.
- **Smooth at 10,000 objects**: a spatial index for drawing, batched sync for slow connections, and a minimap.
- **Accessible board outline** for screen-reader and keyboard users, a **one-handed phone layout**, and a **one-minute tour**.

Everything is documented in [docs/](docs/README.md). Start with [architecture.md](docs/architecture.md), and see [defense.md](docs/defense.md) for the project's four "questions to defend".

## Run it

The full stack, exactly as on the VPS (needs Docker):

```bash
docker compose up -d --build
docker compose exec server node scripts/seed-dev.ts   # optional demo accounts
```

Open http://localhost:8080. The demo accounts use the password `sketchsync-demo`: `lecturer@sketchsync.test`, `student@sketchsync.test` and `student2@sketchsync.test`.

To develop with hot reload, see [docs/deployment.md](docs/deployment.md#developing-with-hot-reload).

## Deploy to a VPS

```bash
cp .env.example .env          # set POSTGRES_PASSWORD and DOMAIN
docker compose --profile https up -d --build
```

Caddy handles HTTPS. For RAM, ports and scaling out, see [docs/deployment.md](docs/deployment.md).

## Repository layout

| Path | What it is |
| --- | --- |
| `app/` | The web app around the editor: boards, sign-in, sharing, version history, offline cache, minimap, outline, tour |
| `packages/` | The drawing editor, plus our spatial index, PDF export and mobile layout |
| `server/` | Node server: Socket.IO sync with per-message permission checks, REST API, operation log and snapshots in Postgres, Redis for scaling out |
| `deploy/` | `nginx.conf` for the web container, `Caddyfile` for HTTPS |
| `docs/` | Design notes, the progress log and how-tos |

## Tests

```bash
cd server && npm test                   # server: accounts, roles, links, live sync, persistence, versions
corepack yarn test:app --watch=false    # editor and app tests
corepack yarn test:typecheck            # TypeScript across the repo
```

## License

MIT. See [LICENSE](LICENSE).
