# Этап 4 — инструменты

Инструменты пишут в `CanvasRenderingContext2D` ([`ToolsServices`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)). Переписывать кисти, пока видео и masked каждый кадр копируют картинку в процессор, бессмысленно: сначала этапы 2–3.

Два подэтапа. Второй — отдельная большая работа.

## 4a — мост 2D offscreen → GPU

Штампы остаются 2D (helper canvas, repeating-координаты как сейчас).

1. Рисовать жест в скрытый 2D-канвас, не в канвас на экране.
2. В конце кадра жеста (или когда картинка изменилась): залить штамп в `PatternBuffer` (`texSubImage2D`). Один раз за кадр рисования. Не снимать соседние паттерны через `getImageData`.
3. Рисование в маску — upload во второй буфер.
4. Платформер playing: жест идёт в world buffer; если world ещё 2D — как сейчас, плюс показ с world. Не писать в канвас на экране напрямую.
5. `CanvasEventsService.buildToolEvent` отдаёт контекст буфера/offscreen, не обязательно `canvasService.context` DOM.

**Ломается:** все кисти/линии, repeating, маска, world buffer.

**Готово когда:** штрих виден на экране, undo после отпускания мыши работает (`getImageData` в этот момент — нормально), repeating-сетка как сейчас.

## 4b — штампы на GPU

Отдельный объём: brush/line как GPU (инстансы, stamp texture). Repeating — тот же набор координат, другой backend. `drawMasked` / `drawWithRotation` — шейдер.

Не начинать, пока 4a стабилен и этапы 2–3 закрыты.

## Где смотреть

- [`CanvasEventsService`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/index.ts)
- [`PatternToolService`](../../../src/store/patterns/_service/patternServices/PatternToolService.ts)
- [`utils/canvas/helpers/draw.ts`](../../../src/utils/canvas/helpers/draw.ts)
- [`repeating/helpers.ts`](../../../src/store/patterns/repeating/helpers.ts) — координаты не менять без нужды

## Не входит

Этап 5. Не менять repeating/rotation (CSS и пересчёт мыши как сейчас).
