# Project overview

**rasterscape** (`rs2`) — browser-based raster graphics editor.

- Repo: `/home/name/Desktop/web/rasterscape`
- GitHub lib for UI buttons/utils: [bbuutoonnss](https://github.com/normalblending/bbuutoonnss)

## Stack

| Layer | Tech |
|-------|------|
| UI | React 18, SCSS |
| State | Redux (+ thunk, reselect, redux-localstorage) |
| Build | Vite 6, TypeScript 5 |
| Graphics | Canvas, p5, d3 (selection paths), WebGL shaders, Web Workers |
| Realtime | socket.io-client v4 (rooms/chat) |
| i18n | i18next + react-i18next |

## Source layout

```
src/
  App.tsx              — root, imports bbuutoonnss CSS
  main.tsx             — entry, global API_URL
  components/
    Main.tsx           — main shell
    Area/              — canvas drawing / selection (uses d3.line)
    Pattern/           — pattern tools, video, room chat
    Tools/             — brush, line, etc.
    _shared/           — buttons (wrap bbuutoonnss), canvas, SVG
  store/               — Redux slices (patterns, tool, hotkeys, rooms, …)
  utils/               — geometry, path, canvas helpers
public/
  config.js            — optional API_URL override (commented)
  workers/             — web worker scripts
```

## Path aliases (vite)

- `store` → `src/store`
- `components` → `src/components`
- `utils` → `src/utils`

## Global config

- `API_URL` — declared in `main.tsx`, used by room socket (`src/store/patterns/room/service.ts`)
- Default backend is external; `public/config.js` can set `API_URL`

## Notable features

- Pattern editing with history, blur, rotating, repeating grids
- Collaborative rooms via WebSocket (`/room` path, query `name`)
- Room list socket: `http://localhost:3000`, path `/rooms`
- Video capture pipeline (CameraService from bbuutoonnss)
- Hotkey system with i18n labels

## Tests

- `src/App.test.tsx` exists but Jest types are not configured; `npm run build` runs `tsc -b` and may fail on pre-existing TS strict errors unrelated to feature work.
