# Этап 3 — masked / preview без полного CPU-композита

`PatternValuesService.updateMasked` снимает canvas и маску в `ImageData` и собирает новый канвас. На видео это не каждый кадр (~100 ms), но всё равно **копия всей картинки в процессор**. Превью и кисть Pattern берут `valuesService.masked`. Если маски нет, уже есть `syncMaskedReference()` (`masked = canvas`) — так и должно остаться: masked это сам буфер, без копии.

## Сделать

1. Нет маски: кисть и превью берут сам буфер, без копии.
2. Есть маска: композит на GPU (шейдер) в отдельную текстуру или on-the-fly при сэмпле. Не `createMaskedImageFromImageData` на каждый кадр видео.
3. `updateForVideoFrame` не гоняет полный CPU masked, если потребители GPU.
4. [`PatternPreviewService`](../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts): маленькая копия 40×40 с GPU, не `drawImage` полной картинки, собранной на процессоре.
5. Кисть/линия Pattern и `BrushSelect`: источник штампа — GPU-буфер или маленький downsample, не полный CPU masked на кадр жеста.
6. Selection-as-brush: тот же контракт для `selected` (сейчас CPU из selection mask).

## Где смотреть

- [`PatternValuesService`](../../../src/store/patterns/_service/patternServices/PatternValuesService.ts)
- [`createMaskedImageFromImageData`](../../../src/utils/canvas/helpers/imageData.ts)
- [`brushPattern.tsx`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushPattern.tsx) / `lineSolidPattern` / `lineTrailingPattern`
- [`PatternPreviewService`](../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts)
- [`selection/helpers.ts`](../../../src/store/patterns/selection/helpers.ts) — копировать в буфер обмена / вырезать можно через `getImageData`; это не каждый кадр

## Сломается, если ошибиться

Кисть/линия Pattern, превью навбара, channel preview, brush select, инверсия маски.

## Готово когда

- Видео-кадр не вызывает полный `updateMasked` CPU.
- Превью обновляется, маска/инверсия видны.
- Штамп с другого паттерна визуально как сейчас.

## Не входит

Перепись всех штампов в шейдеры (этап 4). Clipboard/cut могут остаться на `getSelectedImageData`.
