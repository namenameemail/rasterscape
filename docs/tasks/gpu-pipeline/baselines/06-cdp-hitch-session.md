# Baseline 06 — CDP + Rec All (hitch session)

Дата: 2026-09-21. Сценарий: жест + видео; Rec **All** ~80 s; параллельно CDP Profiler (~123 s wall).

Сырьё (gitignore): `profiling/latest.json`, `profiling/cdp-latest.json`.

## Rec

| | |
|---|---|
| `frame.interval` | n=2870, avg **19.3** ms, max **99.9** ms |
| hitch ≥50 ms | **32** (все с draw+canvas span Σ &lt; 10 ms рядом) |
| `canvas.stampGpu` / `compositeLayerGpu` | 1921 / 595 — GPU draw ок |
| `projects.autosave.serialize` | **8×**, avg 951 ms, max **1794** ms |
| hotkeys.alt+p logs | **5710** (bind/unbind spam) |

Пересечение hitch ↔ окно autosave: только 2 из 32 (frames 1855, 1876). Autosave тяжёлый, но не единственный источник дыр.

## CDP (top self, не idle)

| self≈ | Что |
|---:|---|
| 2.1 s + 1.5 s | `texSubImage2D` (GL upload) |
| 1.6 s | `getBoundingClientRect` |
| 1.2 s + 0.85 s | `keyboardjs` `KeyCombo._splitStr` / `Keyboard.unbind` |
| **0.79 s** | **`(garbage collector)`** |
| 0.78 s + 0.67 s | React `validateProperty` / `diffProperties` |
| 0.73 s | `ProfileLogger` (persist/запись сессии) |
| 0.66 s | `ButtonNumberCF` |
| 0.42 s | `projectsDb` |
| ~0.3 s сумм. | `cloneImageBuffer` (history/alloc) |

`src/` draw (`stampTextures` и т.п.) — десятки ms, не класс hitch.

## Вердикт (строго)

| | Однозначно? |
|--|:-----------:|
| Hitch ≠ дорогой GPU/draw | **да** (32/32, span Σ &lt; 10 ms) |
| Autosave serialize дорогой | **да** (max 1794 ms) |
| Hotkey bind/unbind spam | **да** (5710 logs) |
| Busy JS + GC в сессии | **да** (CDP totals) |
| Каждый hitch = keyboardjs / autosave / GC | **нет** (autosave overlap 2/32; CDP не per-hitch) |

План фикса: [`../done/06-frame-hitches.md`](../done/06-frame-hitches.md) — п.1 hotkeys, п.2 autosave, п.3 alloc/GC.
