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

## Где смотреть

- [`CanvasEventsService/ToolsServices`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)
- [`utils/canvas/helpers/draw.ts`](../../../src/utils/canvas/helpers/draw.ts)
- [`composite.ts`](../../../src/utils/canvas/helpers/composite.ts)

## Не входит

Этап 5. Не менять repeating/rotation (CSS и пересчёт мыши).
