# Running and deploying

## Full stack on your machine (same as the VPS)

```bash
docker compose up -d --build
```

Open http://localhost:8080. This builds the app into an nginx image and starts the server, Postgres and Redis. Stop with `docker compose down` (add `-v` to wipe the database).

Demo accounts (password `sketchsync-demo`): `lecturer@sketchsync.test`, `student@sketchsync.test`, `student2@sketchsync.test`. Create them with:

```bash
docker compose exec server node scripts/seed-dev.ts
```

## Developing with hot reload

```bash
corepack yarn install                     # once, repo root
docker compose up -d postgres redis       # Postgres on 127.0.0.1:5433
cd server && npm install && npm run dev   # server on :3002, restarts on save
npm run seed:dev                          # demo accounts (once)
```

In another terminal at the repo root:

```bash
corepack yarn start                       # app on http://localhost:3001
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3002` and keeps the browser's `Host` header, like nginx does. The server refuses writes whose `Origin` doesn't match the `Host`.

Tests:

```bash
cd server && npm test                     # server integration tests (needs Postgres; uses database sketchsync_test)
corepack yarn test:app --watch=false      # editor + app tests
corepack yarn test:typecheck              # TypeScript, whole repo
```

Create the test database once with:

```bash
docker compose exec postgres psql -U sketchsync -c "create database sketchsync_test"
```

## Deploying to a VPS

1. Install Docker and the Compose plugin on the VPS.
2. Point your domain's DNS **A record** at the VPS IP.
3. On the VPS:

   ```bash
   git clone <this repo> sketchsync && cd sketchsync
   cp .env.example .env    # set POSTGRES_PASSWORD and DOMAIN
   docker compose --profile https up -d --build
   ```

4. Open `https://<your domain>`. Caddy gets and renews the TLS certificate.

Notes:

- **Use HTTPS.** Session cookies are marked `Secure` on HTTPS, the PWA and clipboard need a secure context, and invite links travel in the URL.
- **Ports 80 and 443 must be free** for Caddy. If the VPS already runs nginx or another proxy, skip the `https` profile and proxy your domain to `127.0.0.1:8080` instead. Allow WebSockets on `/socket.io/`, and pass `X-Forwarded-Proto`.
- **Building the app needs about 4 GB of RAM.** On a small VPS, add swap first, or build the images elsewhere and push them to a registry.
- **Set `POSTGRES_PASSWORD` before the first start.** Postgres keeps the password it was created with.
- Update with `git pull && docker compose --profile https up -d --build`. Database migrations run automatically when the server starts.

## Scaling out

The server can run as several processes behind nginx:

```bash
docker compose up -d --scale server=3
```

How the processes cooperate:

- **Redis** (Socket.IO Redis adapter) delivers a message to everyone in a board, whichever process their connection landed on.
- Each process keeps its own in-memory copy of open boards. Accepted changes are passed to the other processes through Redis, and access changes such as a revoked link are broadcast the same way.
- The **operation log in Postgres** is the source of truth. Compaction takes a per-board lock, so processes don't step on each other.
- nginx spreads WebSocket connections across the processes using Docker's DNS.

The one requirement: Socket.IO's long-polling fallback, used only when WebSockets are blocked, needs **sticky sessions** with more than one process. WebSocket connections, the normal case, don't.

## Configuration

Server (environment variables in `docker-compose.yml`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3002` | HTTP and Socket.IO port |
| `DATABASE_URL` | local Postgres on 5433 | Postgres connection |
| `REDIS_URL` | unset | turns on cross-process sync |
| `CORS_ORIGINS` | unset | comma-separated origins, if the app is hosted on another domain |
| `SESSION_DAYS` | `30` | how long sign-ins last |
| `OPS_PER_COMPACTION` | `500` | ops between snapshots |
| `AUTO_VERSION_INTERVAL_MS` | 30 minutes | minimum gap between automatic versions |
| `ROOM_UNLOAD_DELAY_MS` | 1 minute | how long an empty board stays in memory |
| `DELETED_ELEMENT_RETENTION_DAYS` | `30` | how long deleted shapes are remembered |
| `MAX_SCENE_BYTES`, `MAX_FILE_BYTES`, `MAX_SOCKET_MESSAGE_BYTES` | 50 MB, 5 MB, 50 MB | size limits |

App (build-time, `.env.production`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_APP_WS_SERVER_URL` | empty (same origin) | Socket.IO server |
| `VITE_APP_STORAGE_URL` | `/api` | REST API |
| `VITE_APP_AI_BACKEND` | empty (off) | optional AI service for text-to-diagram |
