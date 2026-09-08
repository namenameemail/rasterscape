# Baseline 04b — жест line/brush-pattern + живое видео (до GPU-штампов)

Дата: 2026-09-09. Набор: **Frame**. Стена ~9.8 s. A←B video + штамп Pattern.

Единицы: **count** — число вызовов; **avg / max / Σ** — миллисекунды (ms). Σ = count × avg.

| Спан / value | count | avg, ms | max, ms | Σ, ms |
|---|---:|---:|---:|---:|
| frame.interval (кадр) | 526 | 18.61 | 266.60 | **9790** |
| draw.tool | 399 | 0.23 | 1.00 | 92 |
| draw.onDraw | 399 | 0.66 | 9.80 | 265 |
| draw.pushFrameRelatedEvent | 399 | 1.07 | 4.40 | 428 |
| canvas.downloadGpu | 401 | 0.30 | 9.20 | **121** |
| canvas.uploadGpu | 403 | 0.11 | 6.40 | 42 |
| canvas.present | 929 | 0.10 | 0.70 | 90 |
| video.pushNewFrame | 526 | 0.08 | 0.40 | 40 |
| video.composite | 526 | 0.04 | 0.40 | 24 |
| video.shaderDraw | 526 | 0.02 | 0.30 | 10 |
| values.updateMasked | 72 | 0.06 | 0.30 | 5 |
| **жест path** (tool+download+upload+present) | | | | **345** |

Критерий 04b: нет `canvas.downloadGpu` на каждый кадр жеста (count ≪ draw.tool).
