# После этапа 2 — source без getImageData

2026-09-08, 15 с (`20:04:05Z` → `20:04:20Z`). Сценарий как у [`01-after.md`](01-after.md): 1920×1080, видео source = паттерн, маска, кисть. Blur и DEPTH в логе нет.

Сводка: [`02-after.session.json`](02-after.session.json).

| Спан | count | avg ms | max ms | было (этап 1) |
|------|------:|-------:|-------:|---------------|
| `video.getFrameData` | 310 | **0.01** | 0.2 | 14.23 |
| `video.source.getImageData` | — | нет | — | 14.20 |
| `video.pushNewFrame` | 310 | **16.74** | 76.8 | 1.68 |
| `video.shaderDraw` | 310 | 0.02 | 0.2 | 0.01 |
| `video.drawImage` | 310 | 1.66 | 124 | 1.99 |
| `canvas.present` | 439 | 0.44 | 3.6 | 0.50 |
| `values.updateMasked` | 47 | **45.53** | 186 | 41.47 |
| `draw.onDraw` | 122 | 16.16 | 186.5 | 14.62 |

`frame.interval`: avg **48.5 ms** (~21 FPS), max **2018**, min 13.1. Было 34.2 ms (~29 FPS).

## Что видно

Съём `getImageData` с кадра видео пропал. Цена не исчезла: `texSubImage3D` канваса 1080p в 3D-текстуру стоит ~16.7 ms — тот же класс копии, что раньше 14.2 ms `getImageData`. Кадр в среднем стал хуже, плюс один затык ~2 с.

`values.updateMasked` по-прежнему ~45 ms раз в ~100 ms — этап 3.
