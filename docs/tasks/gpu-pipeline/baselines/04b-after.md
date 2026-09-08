# After 04b — GPU-штамп + живое видео

Дата: 2026-09-09. Набор: **Frame**. Стена ~12.7 s. A←B video + line/brush Pattern.

Единицы: **count** — число вызовов; **avg / max / Σ** — миллисекунды (ms). Σ = count × avg.

| Спан / value | count | avg, ms | max, ms | Σ, ms |
|---|---:|---:|---:|---:|
| frame.interval (кадр) | 718 | 17.70 | 66.70 | **12708** |
| draw.tool | 607 | 0.24 | 11.90 | 146 |
| draw.onDraw | 607 | 0.40 | 12.20 | 241 |
| draw.pushFrameRelatedEvent | 607 | 1.11 | 4.10 | 675 |
| canvas.downloadGpu | 33 | 0.48 | 7.60 | 16 |
| canvas.uploadGpu | — | — | — | — |
| canvas.stampGpu | 606 | 0.11 | 11.40 | 65 |
| canvas.present | 1327 | 0.15 | 1.20 | 193 |
| video.pushNewFrame | 718 | 0.07 | 0.70 | 48 |
| video.composite | 718 | 0.05 | 1.00 | 36 |
| video.shaderDraw | 718 | 0.02 | 0.30 | 12 |
| values.updateMasked | 2 | 0.00 | 0.00 | 0 |
| **жест path** (tool+download+upload+stamp+present) | | | | **421** |

Сравнение с [04b-before](04b-before.md): `downloadGpu` Σ 121→16 ms; кадр avg 18.61→17.70 ms. Суммарный бюджет жеста почти тот же (~345→421 ms за сессию / ~35→33 ms на секунду стены) — убрали roundtrip, но `stampGpu`+`present` съедают похожий объём.
