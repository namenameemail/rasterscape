# Этап 3 — masked / preview без полного CPU-композита

`PatternValuesService.updateMasked` снимает canvas и маску в `ImageData` и собирает новый канвас. На видео это не каждый кадр (~100 ms), но всё равно **копия всей картинки в процессор**. Превью и кисть Pattern берут `valuesService.masked`. Если маски нет, уже есть `syncMaskedReference()` (`masked = canvas`) — так и должно остаться: masked это сам буфер, без копии.

После этапа 2 это главный съём на кадре видео: [`baselines/02-after.md`](../baselines/02-after.md) — `values.updateMasked` **45.5 ms** (47 раз за 15 с). `video.source.getImageData` уже нет. Общий GL и текстура буфера — этап 4, сюда не тащить.

## Сделать

1. Нет маски: кисть и превью берут сам буфер, без копии.
2. Есть маска: композит на GPU (шейдер) в отдельную текстуру или on-the-fly при сэмпле. Не `createMaskedImageFromImageData` на каждый кадр видео.
3. `updateForVideoFrame` не гоняет полный CPU masked, если потребители GPU.
4. [`PatternPreviewService`](../../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts): маленькая копия 40×40 с GPU, не `drawImage` полной картинки, собранной на процессоре.
5. Кисть/линия Pattern и `BrushSelect`: источник штампа — GPU-буфер или маленький downsample, не полный CPU masked на кадр жеста.
6. Selection-as-brush: тот же контракт для `selected` (сейчас CPU из selection mask).

## Где смотреть

- [`PatternValuesService`](../../../../src/store/patterns/_service/patternServices/PatternValuesService.ts)
- [`createMaskedImageFromImageData`](../../../../src/utils/canvas/helpers/imageData.ts)
- [`brushPattern.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushPattern.tsx) / `lineSolidPattern` / `lineTrailingPattern`
- [`PatternPreviewService`](../../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts)
- [`selection/helpers.ts`](../../../../src/store/patterns/selection/helpers.ts) — копировать в буфер обмена / вырезать можно через `getImageData`; это не каждый кадр

## Сломается, если ошибиться

Кисть/линия Pattern, превью навбара, channel preview, brush select, инверсия маски.

## Готово когда

- Видео-кадр не вызывает полный `updateMasked` CPU.
- Превью обновляется, маска/инверсия видны.
- Штамп с другого паттерна визуально как сейчас.

## Не входит

Перепись всех штампов в шейдеры (этап 4). Clipboard/cut могут остаться на `getSelectedImageData`.

---

## Закрыто

Дата: 2026-09-08. Ветка `gpu-pipeline`.

Съём `getImageData` из masked/selected на кадре убран. Композит — 2D `drawImage`, не GL-шейдер (это этап 4, когда буфер станет текстурой).

### Сделано

- **1.** Нет маски: `masked` = канвас буфера.
- **2.** Есть маска: [`composite.ts`](../../../../src/utils/canvas/helpers/composite.ts) — `source-in` / `destination-out` в переиспользуемый канвас. Не `createMaskedImageFromImageData`.
- **3.** `updateForVideoFrame` не зовёт `updateMasked`.
- **4.** Превью 40×40 само letterbox'ит буфер и маску.
- **5.** Штамп берёт `.masked` после GPU-композита на жесте (`updateMaskedIfNeeded`), не на кадре видео.
- **6.** `selected` — тот же композит с `selectionService.maskCanvas`. `getImageData` маски выделения только при смене сегментов.

### Замер

[`baselines/03-after.md`](../baselines/03-after.md) vs [`02-after.md`](../baselines/02-after.md), 1080p:

| | этап 2 | этап 3 |
|--|-------:|-------:|
| `values.updateMasked` | **45.5 ms** / max 186 | **0.10 ms** / max 0.3, 32 раза (жест) |
| `draw.onDraw` | 16.2 / 186.5 | **0.33** / 1.2 |
| `video.pushNewFrame` | 16.7 | 25.6 |
| `frame.interval` | 48.5 (~21 FPS) | 42.0 (~24 FPS), пик 950 |

Критерий «видео-кадр не вызывает полный CPU masked» выполнен. FPS почти не вырос: кадр держит `pushNewFrame`.

### Ушло в этап 4

[`04b-gpu-stamps.md`](04b-gpu-stamps.md): штамп сэмплит текстуру (срез закрыт). Preview / masked / selection — [`../04c/`](../04c/README.md). `createMaskedImageFromImageData` остаётся для clipboard / старого `patternValues`.

### Следующая задача

[`04-tools.md`](04-tools.md).
