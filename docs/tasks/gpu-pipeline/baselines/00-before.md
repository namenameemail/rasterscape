# Замер «до» (этап 0)

Дата: 2026-09-08, ~28 с (`2026-09-08T14:35:11Z` → `14:35:39Z`).  
Сценарий: видео A, source = паттерн B; плюс кисть типа pattern (не в исходном чеклисте, на спаны видео не мешает).  
Blur и DEPTH в сессии не видно. Размер A/B в профиле нет.

Полный `profiling/latest.json` ~3 МБ (21489 entries). В git — только summary: [00-before.session.json](00-before.session.json).

## summary.spans

| name | count | avgMs | maxMs |
|------|------:|------:|------:|
| video.getFrameData | 1653 | 1.11 | 4.60 |
| video.source.getImageData | 1653 | 1.10 | 4.60 |
| video.pushNewFrame | 1653 | 0.13 | 0.70 |
| video.shaderDraw | 1653 | 0.01 | 0.10 |
| video.drawImage | 1653 | 0.11 | 0.50 |
| video.valuesService | 1653 | 0.00 | 0.10 |
| values.updateMasked | 6 | 3.25 | 6.40 |
| draw.tool | 1320 | 0.15 | 0.70 |
| draw.valuesMasked | 1320 | 0.00 | 0.10 |

`video.getFrameData` ≈ `video.source.getImageData`: почти всё время съёма source — это `getImageData`. Шейдер (`video.shaderDraw`) дешевле примерно в 100 раз.

## summary.values

| name | count | avg | max |
|------|------:|----:|----:|
| frame.interval | 1653 | 16.81 | 34.10 |

~60 FPS в среднем, пик кадра ~34 ms.
