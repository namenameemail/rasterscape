# Этап 4 — инструменты

Инструменты пишут в `CanvasRenderingContext2D` ([`ToolsServices`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)). Переписывать их поверх старого readback-пайплайна бессмысленно: сначала этапы 2–3.

Два подэтапа. Второй — отдельная большая работа.

## 4a — мост 2D offscreen → GPU

Штампы остаются 2D (helper canvas, repeating-координаты как сейчас).

1. Целевой контекст жеста — offscreen 2D, не DOM presenter.
2. В конце кадра жеста (или по dirty): `texSubImage2D` / upload в `PatternBuffer`. Один upload на кадр рисования, не readback соседей.
3. Рисование в маску — upload во второй буфер.
4. Платформер playing: жест идёт в world buffer; если world ещё 2D — как сейчас, плюс present с world. Не писать в DOM display напрямую.
5. `CanvasEventsService.buildToolEvent` отдаёт контекст буфера/offscreen, не обязательно `canvasService.context` DOM.

**Ломается:** все кисти/линии, repeating, маска, world buffer.

**Готово когда:** штрих виден на presenter, undo после `updateImage`/`pushHistory` (readback на отпускание ок), repeating-сетка совпадает.

## 4b — штампы на GPU

Отдельный объём: brush/line как GPU (инстансы, stamp texture). Repeating — тот же набор координат, другой backend. `drawMasked` / `drawWithRotation` — шейдер.

Не начинать, пока 4a стабилен и этапы 2–3 закрыты.

## Где смотреть

- [`CanvasEventsService`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/index.ts)
- [`PatternToolService`](../../../src/store/patterns/_service/patternServices/PatternToolService.ts)
- [`utils/canvas/helpers/draw.ts`](../../../src/utils/canvas/helpers/draw.ts)
- [`repeating/helpers.ts`](../../../src/store/patterns/repeating/helpers.ts) — координаты не менять без нужды

## Не входит

Cook graph (этап 5). Смена модели repeating/rotation (CSS + inverse mouse остаются).
