# CLAUDE.md

## Project Structure

SketchSync is a **monorepo** with the editor packages, the web app and the server:

- **`packages/editor/`** - The drawing editor React component, `@sketchsync/editor`
- **`app/`** - The web app (boards, sign-in, sharing, version history) built on the editor
- **`packages/`** - Core packages: `@sketchsync/common`, `@sketchsync/element`, `@sketchsync/math`, `@sketchsync/utils`
- **`server/`** - Node server for sync, accounts, boards and storage (its own `npm` project)

## Development Workflow

1. **Package Development**: Work in `packages/*` for editor features
2. **App Development**: Work in `app/` for app-specific features
3. **Testing**: Always run `yarn test:update` before committing
4. **Type Safety**: Use `yarn test:typecheck` to verify TypeScript

## Development Commands

```bash
yarn test:typecheck  # TypeScript type checking
yarn test:update     # Run all tests (with snapshot updates)
yarn fix             # Auto-fix formatting and linting issues
```

## Architecture Notes

### Package System

- Uses Yarn workspaces for monorepo management
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration
