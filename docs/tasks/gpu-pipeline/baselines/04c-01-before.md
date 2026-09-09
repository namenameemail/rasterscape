# Baseline 04c.01 — жест при непустом выделении (до GPU-clip)

Дата: 2026-09-09. Frame. Стена ~10.7 s. Выделение + рисование (без видео в этой сессии).

Единицы: count; avg/max/Σ — ms.

| Спан | count | avg, ms | max, ms | Σ, ms |
|---|---:|---:|---:|---:|
| frame.interval | 147 | 34.80 | 1066.70 | 5115 |
| draw.tool | 150 | 1.71 | 14.50 | 256 |
| draw.onDraw | 150 | 2.14 | 14.90 | 321 |
| canvas.downloadGpu | — | — | — | — |
| canvas.uploadGpu | 156 | 0.34 | 4.00 | 53 |
| canvas.stampGpu | — | — | — | — |
| canvas.compositeLayerGpu | — | — | — | — |
| canvas.present | 156 | 0.07 | 0.30 | 10 |
| draw.valuesMasked | 150 | 0.01 | 0.40 | 2 |

Критерий: GPU-путь при selection — stampGpu/compositeLayerGpu ≈ draw.tool; uploadGpu не на каждый жест (или ≪); без downloadGpu на dest.
