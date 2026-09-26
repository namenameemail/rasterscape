# 05 — отсечение DEPTH в raymarch

**Статус: закрыт** (2026-09-26).

## Сейчас

DEPTH cut в 2D-видео тянет карты с других паттернов. В volume view после [04](04-cut-fxy.md) есть только FXY.

## Сделать

Прокинуть DEPTH-карты в volume-шейдер (как в видео), cut в том же raymarch. Учесть cook/wanted для source-паттернов. Следить за ценой кадра (march + несколько текстур).

Зависит от [04](04-cut-fxy.md).

## Сделано

- `evalDepthCut` в [`fxyCut.glsl`](../../../../../src/store/patterns/_service/patternServices/PatternVideoService/VideoVolumeView/shaders/fxyCut.glsl): до 4 карт, component / zed / zd, UV как в 2D (`1.0 - y`); half-space тот же инвертированный, что у FXY.
- `VideoVolumeView.setDepthCut` + bind `ensureGpu()` на TEXTURE1–4 в `render` (dummy на слотах, чтобы не конфликтовать с `sampler3D`).
- `onFrame`: volume + DEPTH CF → `setDepthCut`.
- Cook/wanted: без изменений — `isPatternWanted` уже тянет DEPTH source при `updatingOn` + cut CF.

## Готово

DEPTH CF срезает объём так же осмысленно, как 2D-видео; без регрессии FXY и обычного кадра.
