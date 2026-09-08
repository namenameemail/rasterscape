# После этапа 3 — masked без getImageData

2026-09-08, 17.5 с (`20:20:12Z` → `20:20:30Z`). Сценарий как у [`02-after.md`](02-after.md): 1920×1080, видео source = паттерн, маска, кисть. Blur и DEPTH в логе нет.

Сводка: [`03-after.session.json`](03-after.session.json).

| Спан | count | avg ms | max ms | было (этап 2) |
|------|------:|-------:|-------:|---------------|
| `video.getFrameData` | 417 | 0.01 | 0.1 | 0.01 |
| `video.pushNewFrame` | 417 | **25.61** | 147.6 | 16.74 |
| `video.shaderDraw` | 417 | 0.02 | 0.2 | 0.02 |
| `video.drawImage` | 417 | 0.22 | 9.8 | 1.66 |
| `canvas.present` | 666 | 0.10 | 0.5 | 0.44 |
| `video.valuesService` | 417 | 0.00 | 0.1 | 0.00 |
| `values.updateMasked` | 32 | **0.10** | 0.3 | **45.53** / 186 |
| `values.updateSelected` | 12 | 0.01 | 0.1 | — |
| `draw.onDraw` | 237 | **0.33** | 1.2 | 16.16 / 186.5 |
| `draw.tool` | 237 | 0.22 | 0.6 | — |

`frame.interval`: avg **42.0 ms** (~24 FPS), max **950**, min 16.5. Было 48.5 ms (~21 FPS), пик 2018.

## Что видно

Критерий этапа 3 выполнен: `values.updateMasked` больше не съём в процессор. 32 раза за сессию — жест кисти, **0.10 ms**, не 45 ms × видео.

`draw.onDraw` упал с 16 ms до 0.3 ms: раньше жест ждал тот же CPU-композит.

Кадр по-прежнему держит `video.pushNewFrame` (~26 ms, заливка 2D→3D). Это этап 4. FPS чуть лучше за счёт пропавших спайков masked, не за счёт шейдера.
