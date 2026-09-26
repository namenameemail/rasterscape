# 04 — отсечение FXY в raymarch

**Статус: закрыт** (2026-09-26).

## Сейчас

Cut FXY есть в 2D-фраге видео. В volume march — нет (после 01–03 виден целый куб).

## Сделать

В шейдере volume view: stop / discard по той же FXY cut, что у видео (params с текущего CF). По возможности общий кусок с видео-frag, без вечной копипасты.

Зависит от рабочего режима 01–03.

## Сделано

- Общий кусок [`fxyCut.glsl`](../../../../../src/store/patterns/_service/patternServices/PatternVideoService/VideoVolumeView/shaders/fxyCut.glsl): те же Parab / Sis2 / Sq / Array → `evalFxyCut`; half-space `insideFxyCut` с учётом `cameraAxis`.
- **Cut offsets** (`x0…z1` из VideoOffset / ButtonNumberCF): сэмпл только внутри окна offset (как remap в 2D-frag); FXY считается в UV этого окна, не в абсолютных координатах куба.
- `VideoVolumeView.setFxyCut` / `clearCut`; в `onFrame` при volume + FXY CF — cut. Offsets применяются и без FXY (кроп куба). DEPTH — [05](05-cut-depth.md).
- 2D-путь `ShaderVideoModule` не трогали.

## Готово

При выбранной FXY cut объём на канвасе срезан по функции; 2D-режим видео не сломан.
