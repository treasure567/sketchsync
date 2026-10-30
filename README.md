# SketchSync

A real-time collaborative whiteboard: several people edit at once, on phones and laptops, over poor connections, and nobody's work is lost.

## Repository layout

```
apps/
  web/        React + TypeScript + Vite frontend
packages/     Shared packages (added as needed)
```

The repo is a [pnpm workspace](https://pnpm.io/workspaces), so the sync server and shared packages can live next to the frontend later.

## Getting started

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev        # start the web app at http://localhost:5173
pnpm build      # type-check and build the web app
pnpm lint       # lint every workspace package
```

## Frontend stack

| Concern  | Choice                    |
| -------- | ------------------------- |
| UI       | React 19 + TypeScript     |
| Bundler  | Vite                      |
| Styling  | Tailwind CSS v4           |
| Routing  | React Router              |
| Linting  | oxlint                    |

Imports from `apps/web/src` use the `@/` alias (for example `import { App } from '@/App'`).

## Reference: Excalidraw

We use [Excalidraw](https://github.com/excalidraw/excalidraw) (MIT) as an architectural reference. Clone it next to this repo, not inside it:

```bash
git clone --depth 1 https://github.com/excalidraw/excalidraw.git ../excalidraw-reference
```

Useful places to read:

- `packages/excalidraw/` - the editor component (canvas rendering, tools, actions, history)
- `packages/element/` - element model, hit-testing, bounds, shape geometry
- `packages/math/` - geometry helpers
- `excalidraw-app/collab/` - real-time collaboration over socket.io
