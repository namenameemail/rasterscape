# Этап 4 — инструменты и общий GL

Инструменты пишут в `CanvasRenderingContext2D` ([`ToolsServices`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices)). Этапы 2–3 закрыты: съёма картинки в процессор на кадре видео больше нет. Кадр держала заливка 2D→3D и то, что буфер ещё канвас.

Два подэтапа, плюс GL-мост. 4b — отдельная большая работа.

## Пока буфер станет GL (с этапов 2–3)

1. Один `GlContext` на приложение. `ShaderVideoModule` не плодит `glCanvas` на паттерн: пишет в FBO/текстуру `PatternBuffer`.
2. Source-паттерн и DEPTH — `sampler2D` / `copyTex`, не `texSubImage*` с 2D-канваса. Скейл размера — на GPU.
3. Блюр видео — шейдер в том же контексте. Кнопка разового блюра в `blur/actions` может остаться на процессоре.
4. `video.drawImage` (GL → 2D буфер) и `canvas.present` уйдут, когда монитор рисует ту же текстуру.
5. Маска — шейдер (или on-the-fly в сэмпле), не полный 2D `source-in` в `.masked`.
6. Штамп Pattern / BrushSelect сэмплит текстуру (downsample на GPU), не `drawImage` полного masked-канваса.

Пока кисти рисуют в 2D-контекст, буфер обязан оставаться 2D. Делать вместе с 4a или сразу после: иначе инструменты ломаются.

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

Не начинать 4b, пока 4a стабилен.

## Где смотреть

- [`CanvasEventsService`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/index.ts)
- [`PatternToolService`](../../../../src/store/patterns/_service/patternServices/PatternToolService.ts)
- [`utils/canvas/helpers/draw.ts`](../../../../src/utils/canvas/helpers/draw.ts)
- [`repeating/helpers.ts`](../../../../src/store/patterns/repeating/helpers.ts) — координаты не менять без нужды

## Не входит

Этап 5. Не менять repeating/rotation (CSS и пересчёт мыши как сейчас).

---

## Закрыто

Дата: 2026-09-08. Ветка `gpu-pipeline`.

Закрыт **4a + GL-мост** (пункты 1–4). 4b (штампы, срез) — [`04b-gpu-stamps.md`](04b-gpu-stamps.md). Оставшийся CPU — [`../04c/`](../04c/README.md).

### Сделано

- **1.** Один [`GlContext`](../../../../src/gl/GlContext.ts). `ShaderVideoModule` шарит канвас, свой `program`, `use()` перед GL.
- **2.** Source: `ensureGpu` + `copyTex` в 3D. DEPTH: bind текстуры буфера. Камера — `texSubImage3D` с video.
- **3.** Блюр кадра видео — шейдер (до 16 тапов). Кнопка разового блюра на процессоре.
- **4.** Кадр видео не пишет GL→2D. Монитор — `presentGl`. 2D — `ensureCpu` на жесте / `getImageData`. Видео на dest — source-over (`video.composite`), не замена текстуры.
- **4a.** Жест в буфер; `presentFromCpu` → `texSubImage2D` раз за кадр рисования. Маска — тот же путь. `buildToolEvent` отдаёт контекст буфера.

### Замер

1080p A←B vs этап 0 ([`00-before-1080.md`](../baselines/00-before-1080.md)) и copyTex ([`04-after.md`](../baselines/04-after.md)). Итог: [`04-gl-present.md`](../baselines/04-gl-present.md).

| | этап 0 1080p | после 4 |
|--|-------:|-------:|
| `video.source.getImageData` | 15.4 ms | нет |
| `values.updateMasked` | 32.7 ms | 0 на кадре видео |
| `video.pushNewFrame` | 1.87 / позже 25.6 | **0.08** |
| `video.drawImage` | 0.19 / позже 3.10 | нет (`composite` 0.05) |
| `frame.interval` | **32.5 ms** (~30 FPS), пик 1330 | **19.8 ms** (~50 FPS), p50 16.7 |

### Ушло дальше

[`04b-gpu-stamps.md`](04b-gpu-stamps.md): штампы на GPU (срез закрыт). [`../04c/`](../04c/README.md): оставшийся CPU по местам.

### Следующая задача

[`../04c/`](../04c/README.md) и/или [`05-cook-graph.md`](../05-cook-graph.md) (независимо).
