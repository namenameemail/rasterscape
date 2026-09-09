# 4b — штампы на GPU

Вынесено из этапа 4. 4a и общий GL закрыты ([`done/04-tools.md`](done/04-tools.md)).

## Сделать

1. Brush/line как GPU. Repeating — тот же набор координат, другой backend.
2. Маска — шейдер / on-the-fly, не полный 2D `source-in`.
3. Штамп Pattern / BrushSelect сэмплит текстуру.

**Готово когда:** штрих как сейчас, без `canvas.downloadGpu` dest на каждый кадр жеста при живом видео.

## Прогресс

- Инструменты рисуют на GPU **всегда** (с видео и без): source-over, без selection, не platformer-world.
- `stampGpu`: Pattern / Trailing / Select. `compositeLayerGpu`: Shape / Solid / SolidPattern («back»).
- `buildToolEvent` больше не делает `ensureCpu` на canvas (только mask). Первый штрих — `ensureGpu` upload, дальше dest остаётся на GPU.
- Fallback 2D: не source-over, selection mask, platformer.
- Ещё не: repeating, selection-mask на GPU, экзотические composite, дешевле `present`.

## Где смотреть

- [`CanvasEventsService/ToolsServices`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)
- [`GlContext`](../../../src/gl/GlContext.ts) — `stampTextures`, `compositeCanvasOver`

## Не входит

Этап 5. Не менять repeating/rotation (CSS и пересчёт мыши).

## Проверка

Frame Rec + video A←B + любой line/brush: `canvas.downloadGpu` ≪ `draw.tool` на dest. После Stop — download на release ок.
