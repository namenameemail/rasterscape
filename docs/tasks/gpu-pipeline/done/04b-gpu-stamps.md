# 4b — штампы на GPU

Вынесено из этапа 4. 4a и общий GL закрыты ([`04-tools.md`](04-tools.md)).

**Статус: вертикальный срез закрыт.** Оставшийся CPU — подзадачи [`../04c/`](../04c/README.md).

## Цель (было)

1. Brush/line на GPU. Repeating — те же координаты, другой backend.
2. Маска паттерна для штампа — шейдер / on-the-fly, не полный 2D masked на каждый сэмпл.
3. Pattern / BrushSelect сэмплят текстуру, не `drawImage` полного masked-канваса.

**Готово когда:** штрих как сейчас, без `canvas.downloadGpu` dest на каждый кадр жеста при живом видео.

## Сделано

- Все 6 tool-сервисов в happy path на GPU **с видео и без** (source-over, без selection, dest = `PatternBuffer`, не platformer world):
  - **stampGpu:** `BrushPattern`, `LineTrailingPattern`, `BrushSelect`
  - **compositeLayerGpu:** `BrushShape`, `LineSolid`, `LineSolidPattern` («back» ± центр)
- `buildToolEvent` не делает `ensureCpu` на canvas (только mask).
- `ensureMaskedGpu` / `ensureSelectedGpu`; dest остаётся на GPU после первого `ensureGpu`.
- Baseline: [`../baselines/04b-before.md`](../baselines/04b-before.md) → [`../baselines/04b-after.md`](../baselines/04b-after.md) — `downloadGpu` с жеста почти убран; кадр avg почти тот же (выигрыш в отсутствии roundtrip, не в FPS).

## Сознательно не в 4b → 4c

См. оглавление [`../04c/`](../04c/README.md) (selection, mask, blend, helper, values, present, platformer, …).

## Где смотреть

- [`CanvasEventsService/ToolsServices`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)
- [`GlContext`](../../../../src/gl/GlContext.ts) — `stampTextures`, `compositeCanvasOver`

## Не входило

Этап 5. Repeating/rotation CSS. Полное закрытие пайплайна — **[`../04c/`](../04c/README.md)**.

## Проверка (4b)

Frame Rec + video A←B + line/brush: `stampGpu` / `compositeLayerGpu` ≈ `draw.tool`; `downloadGpu` ≪ draw на dest. Без видео — тот же GPU-путь.
