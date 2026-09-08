# Этап 3 — masked / preview без полного CPU-композита

`PatternValuesService.updateMasked` читает canvas+mask в `ImageData` и собирает новый канвас. На видео это throttled (~100ms), но всё ещё полный readback. Превью и кисть Pattern сидят на `valuesService.masked`. Без маски уже есть `syncMaskedReference()` (`masked = canvas`) — это нужно сохранить по смыслу: `masked === буфер`.

## Сделать

1. Нет маски: потребители берут `PatternBuffer` / presenter-source напрямую, без копии.
2. Есть маска: композит на GPU (шейдер) в отдельную текстуру или on-the-fly при сэмпле. Не `createMaskedImageFromImageData` на каждый кадр видео.
3. `updateForVideoFrame` не гоняет полный CPU masked, если потребители GPU.
4. [`PatternPreviewService`](../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts): blit в 40×40 с GPU (downsample), не `drawImage` полного masked CPU-canvas.
5. Кисть/линия Pattern и `BrushSelect`: источник штампа — GPU-буфер или маленький downsample, не полный CPU masked на кадр жеста.
6. Selection-as-brush: тот же контракт для `selected` (сейчас CPU из selection mask).

## Где смотреть

- [`PatternValuesService`](../../../src/store/patterns/_service/patternServices/PatternValuesService.ts)
- [`createMaskedImageFromImageData`](../../../src/utils/canvas/helpers/imageData.ts)
- [`brushPattern.tsx`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushPattern.tsx) / `lineSolidPattern` / `lineTrailingPattern`
- [`PatternPreviewService`](../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts)
- [`selection/helpers.ts`](../../../src/store/patterns/selection/helpers.ts) — clipboard/cut по-прежнему могут readback (не кадр)

## Сломается, если ошибиться

Кисть/линия Pattern, превью навбара, channel preview, brush select, инверсия маски.

## Готово когда

- Видео-кадр не вызывает полный `updateMasked` CPU.
- Превью обновляется, маска/инверсия видны.
- Штамп с другого паттерна визуально как сейчас.

## Не входит

Перепись всех штампов в шейдеры (этап 4). Clipboard/cut могут остаться на `getSelectedImageData`.
