# После этапа 4a — source copyTex

2026-09-08, 28.3 с (`20:38:31Z` → `20:38:59Z`). Сценарий как у [`03-after.md`](03-after.md): 1920×1080, видео source = паттерн, маска, кисть. Blur и DEPTH в логе нет.

Сводка: [`04-after.session.json`](04-after.session.json).

| Спан | count | avg ms | max ms | было (этап 3) |
|------|------:|-------:|-------:|---------------|
| `video.pushNewFrame` | 597 | **0.21** | 10.2 | **25.61** |
| `canvas.uploadGpu` | 419 | 0.30 | 5.2 | — |
| `video.shaderDraw` | 597 | 0.04 | 0.6 | 0.02 |
| `video.drawImage` | 597 | **3.10** | 92.3 | 0.22 |
| `canvas.present` | 1016 | 0.84 | 17.5 | 0.10 |
| `values.updateMasked` | 104 | 0.20 | 0.5 | 0.10 |
| `draw.onDraw` | 411 | 0.97 | 6.2 | 0.33 |
| `draw.tool` | 411 | 0.48 | 2.5 | 0.22 |

`frame.interval`: avg **40.2 ms** (~25 FPS), max **367**, min 8.4. Было 42.0 ms (~24 FPS). Без жеста (186 кадров): p50 **16.7 ms** (~60 FPS), avg 27.9.

## Что видно

Критерий copyTex выполнен: `video.pushNewFrame` **25.6 ms → 0.21 ms**. `canvas.uploadGpu` почти только на штрихе (411 из 419; 4 кадра видео без жеста).

Средний FPS почти не вырос: в сессии много кисти (411/597 кадров), жест ~50 ms. Без жеста медиана кадра 16.7 ms.

Новый держатель кадра — `video.drawImage` **3.1 ms** (`captureFramebuffer` + GL→2D). Ушло в `presentGl` / composite ([`04-gl-present.md`](04-gl-present.md)).
