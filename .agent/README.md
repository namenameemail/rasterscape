# Agent docs — rasterscape

Internal notes for Cursor agents working on this repo. Start here before making changes.

## Files

| File | Contents |
|------|----------|
| [project.md](./project.md) | What the app is, stack, layout |
| [development.md](./development.md) | Run, build, local deps |
| [dependencies.md](./dependencies.md) | External libs, versions, audit history |
| [bbuutoonnss.md](./bbuutoonnss.md) | Local UI lib setup, build quirks |
| [config.json](./config.json) | Paths and dev defaults (bbuutoonnss location, port) |

## Quick start

```bash
npm run run
```

This links local `bbuutoonnss` and starts Vite. See [development.md](./development.md).

## Conventions

- Prefer `npm run run` over manual `npm link` steps.
- `bbuutoonnss` is a **sibling repo** by default: `../bbuutoonnss` relative to rasterscape root.
- Override path: `BBUUTOONNSS_PATH=/path/to/bbuutoonnss npm run run`
- Backend API is **not** in this repo; socket.io rooms need a separate server (v4+ after security upgrade).
- Update these docs when you learn something non-obvious about the project.
