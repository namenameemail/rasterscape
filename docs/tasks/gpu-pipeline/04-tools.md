# Этап 4 — инструменты и общий GL

Инструменты пишут в `CanvasRenderingContext2D` ([`ToolsServices`](../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)). Переписывать кисти, пока видео и masked каждый кадр копируют картинку в процессор, бессмысленно: сначала этапы 2–3.

С этапа 2 сюда ушло то, что нельзя сделать, пока буфер — 2D-канвас: общий `GlContext`, выход шейдера в текстуру, source как `sampler2D`. Без этого `pushNewFrame` на 1080p стоит **16.7 ms** ([`baselines/02-after.md`](baselines/02-after.md)) — `texSubImage3D` с 2D-канваса, та же копия что бывший `getImageData`.

Два подэтапа, плюс GL-мост. 4b — отдельная большая работа.

## С этапа 2 (пока буфер станет GL)

1. Один `GlContext` на приложение. `ShaderVideoModule` не плодит `glCanvas` на паттерн: пишет в FBO/текстуру `PatternBuffer`.
2. Source-паттерн и DEPTH — `sampler2D` / `copyTex`, не `texSubImage*` с 2D-канваса. Скейл размера — на GPU.
3. Блюр видео — шейдер в том же контексте. Сейчас кадр блюрится через `filter: blur()` ([`blur.ts`](../../../src/utils/canvas/helpers/blur.ts)); кнопка разового блюра в `blur/actions` может остаться на процессоре.
4. `video.drawImage` (GL → 2D буфер, ~1.7 ms) и `canvas.present` уйдут, когда монитор рисует ту же текстуру.

Пока кисти рисуют в 2D-контекст, буфер обязан оставаться 2D — поэтому это не закрыли на этапе 2. Делать вместе с 4a или сразу после: иначе инструменты ломаются.

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
