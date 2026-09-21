# After 04c.01 — жест при непустом выделении (GPU-clip)

Дата: 2026-09-21. Набор: **Frame**.

Единицы: count; avg/max/Σ — ms. Σ = count × avg.

## A — layer (Shape/Solid)

Стена ~18.0 s. [`04c-01-after.session.json`](04c-01-after.session.json).

| Спан | count | avg, ms | max, ms | Σ, ms |
|---|---:|---:|---:|---:|
| frame.interval | 842 | 18.50 | 466.10 | **15578** |
| draw.tool | 843 | 2.96 | 6.20 | 2493 |
| draw.onDraw | 843 | 3.12 | 6.40 | 2633 |
| draw.pushFrameRelatedEvent | 843 | 1.13 | 2.20 | 955 |
| canvas.downloadGpu | 1 | 0.30 | 0.30 | 0.3 |
| canvas.uploadGpu | 2 | 0.00 | 0.00 | 0 |
| canvas.stampGpu | — | — | — | — |
| canvas.compositeLayerGpu | 842 | 2.14 | 4.30 | 1803 |
| canvas.present | 845 | 0.13 | 0.50 | 106 |

## B — stamp (кисть / pattern)

Стена ~9.8 s. [`04c-01-after-stamp.session.json`](04c-01-after-stamp.session.json).

| Спан | count | avg, ms | max, ms | Σ, ms |
|---|---:|---:|---:|---:|
| frame.interval | 400 | 17.93 | 466.70 | **7172** |
| draw.tool | 401 | 1.23 | 3.70 | 492 |
| draw.onDraw | 401 | 1.43 | 4.20 | 573 |
| draw.pushFrameRelatedEvent | 401 | 1.08 | 15.00 | 435 |
| canvas.downloadGpu | 1 | 0.30 | 0.30 | 0.3 |
| canvas.uploadGpu | 1 | 0.00 | 0.00 | 0 |
| canvas.stampGpu | 401 | 1.19 | 3.50 | 479 |
| canvas.compositeLayerGpu | — | — | — | — |
| canvas.present | 403 | 0.15 | 0.50 | 60 |

## vs [04c-01-before](04c-01-before.md)

| | before | after A | after B |
|---|---:|---:|---:|
| GPU path | — | **842** layer | **401** stamp |
| `uploadGpu` count | 156 | **2** | **1** |
| `downloadGpu` count | — | **1** | **1** |
| `frame.interval` avg | 34.80 | **18.50** | **17.93** |
| `draw.tool` avg | 1.71 | 2.96 | **1.23** |

Критерий выполнен на обоих путях: GPU-span ≈ `draw.tool`; `uploadGpu`/`downloadGpu` не на жест.

`frame.interval` max ~467 ms — единичный hitch вне draw-спанов (GC/history/autosave), не selection-clip.
