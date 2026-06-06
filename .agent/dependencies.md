# Dependencies

## bbuutoonnss (local, required)

Shared UI/util library — **not** on npm for this project; linked from disk.

| Export used in rasterscape | File |
|----------------------------|------|
| CSS `dist/bbuutoonnss.css` | `App.tsx` |
| `Button` | `Test.tsx`, `_shared/buttons/simple/Button` |
| `ButtonSelect` | `Tools/Line.tsx` |
| `SelectVideoDevice` | `Pattern/VideoControls` |
| `useDrag` | `VideoOffsetForm` |
| `CameraService`, `CameraServiceInitParams` | `PatternVideoService` |

Repo: https://github.com/normalblending/bbuutoonnss  
Default local path: `../bbuutoonnss`

## Direct npm dependencies (notable)

| Package | Version | Notes |
|---------|---------|-------|
| react / react-dom | ^18.3 | |
| redux ecosystem | mixed pinned | legacy versions |
| d3 | ^7.9 | was v5; only `d3.line` in Selection |
| lodash | ^4.18.1 | omit, throttle |
| socket.io-client | ^4.8.3 | replaced `socket.io` 2.x |
| p5 | 0.8.0 | pinned |
| vite | ^6.4.3 | dev; esbuild 0.25+ |

## Security audit (2025-06)

Upgraded from 21 vulnerabilities → **0**:

- lodash 4.17.15 → 4.18.1
- d3 5.12.0 → 7.9.0 + `@types/d3`
- socket.io 2.3.0 → socket.io-client 4.8.3 (server package removed)
- vite 5 → 6.4.3

`npm audit fix --force` was **not** used (would have jumped to vite 8 blindly).

## Peer / legacy

- `style-loader`, `url-loader` — webpack-era deps, may be unused with Vite
- `redux@4`, `@reduxjs/toolkit@^1.9` — coexist in project

## Optional / external

- **bbuutoonnss** — must be built and linked
- **Backend API** — separate service for rooms
