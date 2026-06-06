# bbuutoonnss — agent notes

Local path (default): `../bbuutoonnss` relative to rasterscape.

## Integration with rasterscape

| rasterscape import | Purpose |
|--------------------|---------|
| `bbuutoonnss/dist/bbuutoonnss.css` | All component styles (extracted at build) |
| `Button`, `ButtonSelect` | UI buttons |
| `SelectVideoDevice` | Video device picker |
| `useDrag` | Drag hook in video offset form |
| `CameraService` | Webcam capture in PatternVideoService |

Linking: `npm run link:bbuutoonnss` in rasterscape runs `file:` install into `node_modules/bbuutoonnss`.

## Build output

After `npm run build`:

- `dist/index.js` (CJS)
- `dist/index.es.js` (ESM)
- `dist/bbuutoonnss.css` (required by rasterscape)
- `dist/index.d.ts` + per-component `.d.ts`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | One-shot Rollup build, exits cleanly |
| `npm run dev` | Rollup watch + LiveReload for lib development |
| `npm run storybook` | Component stories on :6006 |

## Fixes applied (2025-06)

1. **livereload only in watch mode** — was blocking `npm run build` / `prepare` from exiting
2. **CSS extract** → `dist/bbuutoonnss.css` — rasterscape imports this file but it was never generated (`extract: false`)
3. **`prepare` → `prepublishOnly`** — `npm install` no longer triggers full rebuild
4. **`exports` + `style` fields** in package.json for modern bundlers

## Dev workflow (both repos)

```bash
# terminal 1 — lib watch
cd ../bbuutoonnss && npm run dev

# terminal 2 — app
cd rasterscape && npm run run
```

After changing lib CSS/TS, rebuild or use `npm run dev` in bbuutoonnss; rasterscape Vite HMR picks up linked package when `server.fs.allow` includes parent dir.

## Repo

https://github.com/normalblending/bbuutoonnss
