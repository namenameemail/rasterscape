# Development

## One-command dev

```bash
npm run run
```

Script: `scripts/run.mjs`

1. `npm install` in rasterscape if `node_modules` missing
2. `scripts/link-bbuutoonnss.mjs`:
   - resolve lib path (see below)
   - clone repo if missing and `cloneIfMissing: true`
   - `npm install --ignore-scripts` + build in bbuutoonnss if needed
   - `npm install --no-save file:<path>` (local symlink, no global `npm link`)
3. `npm run dev` (Vite)

## bbuutoonnss path resolution

Priority:

1. `BBUUTOONNSS_PATH` env var (absolute or relative to project root)
2. `.agent/config.json` → `bbuutoonnss.path` (default: `../bbuutoonnss`)
3. Clone from `bbuutoonnss.repo` if directory missing

Link only (no dev server):

```bash
npm run link:bbuutoonnss
```

## bbuutoonnss build

Library is Rollup-based. Outputs:

- `dist/index.js`, `dist/index.es.js`
- `dist/bbuutoonnss.css` (imported in `App.tsx`)

Build command in lib: `npm run build` (one-shot, exits cleanly)

Dev watch + LiveReload: `npm run dev`

See [bbuutoonnss.md](./bbuutoonnss.md) for lib-specific fixes (CSS extract, rollup livereload, prepare hook).

## Vite + local bbuutoonnss

`vite.config.ts` sets:

- `resolve.preserveSymlinks: true`
- `server.fs.allow` includes parent dir and `../bbuutoonnss`

Needed so Vite resolves the `file:`-linked package outside the project root.

Linking uses `npm install --no-save file:<path>` instead of global `npm link` (avoids npm prefix permission issues in Cursor/sandboxed environments).

## Other scripts

| Command | Purpose |
|---------|---------|
| `npm start` / `npm run dev` | Vite only (requires bbuutoonnss already linked) |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Build without bbuutoonnss

Production build fails if `bbuutoonnss` is not linked/installed. Always run `npm run link:bbuutoonnss` first.

## Backend

Not in this repo. README references linking bbuutoonnss only.

Socket endpoints used by frontend:

- Rooms list: `http://localhost:3000`, path `/rooms`
- Pattern room: `API_URL`, path `/room`, query `{ name }`

After socket.io-client upgrade to v4, backend must run **socket.io server v3+** (prefer v4).

## Port

Default Vite port 5173. Override in `.agent/config.json` → `devServer.port` or `PORT` env.
