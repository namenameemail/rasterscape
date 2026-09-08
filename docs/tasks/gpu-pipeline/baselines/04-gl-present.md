# После GL-present и composite

2026-09-08, 15.8 с (`20:55:25Z` → `20:55:41Z`). Сценарий как у [`04-after.md`](04-after.md): 1920×1080, видео source = паттерн, маска, кисть. Плюс фикс: видео source-over на dest, не замена текстуры.

Сводка: [`04-gl-present.session.json`](04-gl-present.session.json).

| Спан | count | avg ms | max ms | было (04-after) |
|------|------:|-------:|-------:|-----------------|
| `video.pushNewFrame` | 755 | 0.08 | 0.5 | 0.21 |
| `video.composite` | 755 | **0.05** | 0.4 | — |
| `video.drawImage` | — | нет | — | **3.10** |
| `video.shaderDraw` | 755 | 0.02 | 0.1 | 0.04 |
| `canvas.present` | 1312 | **0.08** | 1.2 | 0.84 |
| `canvas.downloadGpu` | 563 | 0.29 | 7.6 | — |
| `canvas.uploadGpu` | 557 | 0.13 | 19.4 | 0.30 |
| `draw.onDraw` | 550 | 0.53 | 3.3 | 0.97 |
| `values.updateMasked` | 6 | 0 | 0 | 0.20 |

`frame.interval`: avg **19.8 ms** (~50 FPS), p50 **16.7**, max **267**. Было 40.2 ms (~25 FPS). Без жеста p50 16.7 (p90 тоже 16.7). С кистью p50 всё ещё 16.7.

## Что видно

`video.drawImage` с кадра нет. Композит на GPU **0.05 ms**. Монитор `presentGl` **0.08 ms**.

`canvas.downloadGpu` почти только жест (550/563): видео помечает 2D устаревшим, кисть снимает GPU→2D. Это не каждый кадр видео без кисти.

FPS упирается во vsync ~60, не в копию 1080p.
