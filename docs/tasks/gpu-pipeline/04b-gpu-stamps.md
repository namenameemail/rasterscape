# 4b — штампы на GPU

Вынесено из этапа 4. 4a и общий GL закрыты ([`done/04-tools.md`](done/04-tools.md)): кисти ещё 2D, кадр видео уже на GPU.

Не начинать, пока 4a стабилен (сейчас да). Этап 5 (cook vs present) можно делать раньше: он не про штампы.

## Сделать

1. Brush/line как GPU (инстансы, stamp texture). Repeating — тот же набор координат ([`repeating/helpers.ts`](../../../src/store/patterns/repeating/helpers.ts)), другой backend. `drawMasked` / `drawWithRotation` — шейдер.
2. Маска — шейдер или on-the-fly в сэмпле, не полный 2D `source-in` в `.masked`.
3. Штамп Pattern / BrushSelect сэмплит текстуру (downsample на GPU), не `drawImage` полного masked-канваса.

Пока кисти 2D, буфер остаётся 2D+текстура: жест → `ensureCpu` / `uploadGpu`.

**Ломается:** все кисти/линии, repeating, маска.

**Готово когда:** штрих как сейчас, без `canvas.downloadGpu` на каждый кадр жеста при живом видео.

## Прогресс

- Before/after: [`baselines/04b-before.md`](baselines/04b-before.md) → [`baselines/04b-after.md`](baselines/04b-after.md).
- `downloadGpu` убран с жеста; `stampGpu` ≈ `draw.tool`. Кадр avg почти тот же (~18.6 → ~17.7 ms) — выигрыш не в FPS, а в отсутствии GPU↔CPU roundtrip.
- `GlContext.stampTextures` + `PatternBuffer.stampGpu` + `gpuAhead` в `buildToolEvent`.
- GPU-путь: `BrushPattern`, `LineTrailingPattern` (source-over, без selection mask).
- Fallback 2D: selection / не source-over; no-op при `isGpuAhead` → `presentGl`.
- CPU-only инструменты (`LineSolidPattern` / shape / select / solid) при видео делают `ensureCpu` — иначе штрих рисовался в stale CPU и `presentGl` его выкидывал («back»+«центр»).
- Ещё не GPU: `LineSolidPattern`, repeating, selection-mask; дешевле `present`.

## Где смотреть

- [`CanvasEventsService/ToolsServices`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)
- [`utils/canvas/helpers/draw.ts`](../../../src/utils/canvas/helpers/draw.ts)
- [`composite.ts`](../../../src/utils/canvas/helpers/composite.ts)

## Не входит

Этап 5. Не менять repeating/rotation (CSS и пересчёт мыши).

## Проверка

Frame Rec + video A←B + line/brush Pattern: `canvas.downloadGpu` count ≪ `draw.tool` (или 0 на жест). После Stop — один download ок (release/`values.update`).
