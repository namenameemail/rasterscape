# 4c.11 — показ на монитор (`present`)

**Статус: закрыт** (2026-09-25). Перенесено из `04c/` → `done/`. Код не меняли.

Словарь: [`../names.md`](../names.md). Код: [`PatternBuffer.ts`](../../../../src/store/patterns/_service/patternServices/PatternBuffer.ts) — `presentGl` / `present`.

## Было

`presentGl`: blit текстуры в default FB + `drawImage` GL-канваса на monitor. На каждом кадре видео и после GPU-штриха. В 4b суммарный `canvas.present` иногда был сопоставим со старым download — казалось узким местом.

## Решение

Сняли Frame Rec (set `frame`):

**Только видео** (~5 с, без жеста):

| | |
|--|--|
| `canvas.present` | 301×, avg **0.25 ms**, Σ ~76 ms ≈ **1.5%** стены |
| `frame.interval` | ~17 ms (~58 fps) |
| Дороже | `canvas.preview` (Σ ~179 ms), не present |

**Видео + штрих** (~13 с, 436 `draw.tool`):

| | Σ ms |
|--|--:|
| `draw.onDraw` | 381 |
| `canvas.preview` | 295 |
| `draw.tool` | 274 |
| `canvas.present` | **210** (~1.6% стены), avg **0.18 ms** |
| `compositeStrokesGpu` | 106 |

Present чаще при жесте, но по времени дёшев. Удешевлять путь на экран сейчас не нужно.

## Готово

Профиль «только видео» и «жест + видео» есть; вывод — не трогать, пока снова не всплывёт в Rec.
