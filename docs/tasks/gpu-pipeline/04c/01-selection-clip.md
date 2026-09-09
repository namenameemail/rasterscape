# 4c.01 — обрезка штриха по выделению

Не путать с «кисть | выдел-е» (`EBrushType.Select`) — то [06](06-brush-select-source.md).  
Словарь: [`../names.md`](../names.md).

## Было

Непустое `selectionService.mask` → любой draw-инструмент в 2D (`ensureCpu` / upload после штриха) + `drawMasked`.

Baseline: [`../baselines/04c-01-before.md`](../baselines/04c-01-before.md) — `uploadGpu`×156, нет `stampGpu`, `draw.tool` avg 1.71 ms, `frame.interval` avg ~35 ms (сессия без видео).

## Сделано

- `stampTextures` / `compositeCanvasOver` принимают `clipMask` (`selectionService.maskCanvas`).
- Stamp-шейдер множит alpha на mask.a в dest-UV; layer-путь — `compositeMasked` слоя, потом blend на dest.
- Tools (Pattern / Trailing / Shape / Solid / SolidPattern): `useGpu` при selection, если есть `maskCanvas`.

## Проверка

Frame Rec + непустое выделение + жест (кисть \| pattern или линия):
- есть `stampGpu` или `compositeLayerGpu` ≈ `draw.tool`;
- нет регулярного `downloadGpu` на dest;
- штрих только внутри выделения.

С видео A←B — то же (раньше selection ломал GPU-ahead).
