# 4c.01 — обрезка штриха по выделению

**Статус: закрыт** (2026-09-21). Перенесено из `04c/` → `done/`.

Не путать с «кисть | выдел-е» (`EBrushType.Select`) — то [`04c-06-brush-select-source.md`](04c-06-brush-select-source.md).  
Словарь: [`../names.md`](../names.md).

## Цель (было)

Непустое выделение → draw остаётся на GPU (`stampGpu` / `compositeLayerGpu`), штрих только внутри mask; без `ensureCpu` / `uploadGpu` на каждый жест.

## Было

Непустое `selectionService.mask` → любой draw-инструмент в 2D (`ensureCpu` / upload после штриха) + `drawMasked`.

Baseline: [`../baselines/04c-01-before.md`](../baselines/04c-01-before.md) — `uploadGpu`×156, нет `stampGpu`/`compositeLayerGpu`, `draw.tool` avg 1.71 ms, `frame.interval` avg ~35 ms (без видео).

## Сделано

- `stampTextures` / `compositeCanvasOver` принимают `clipMask` (`selectionService.maskCanvas`).
- Stamp-шейдер: alpha × mask.a в dest-UV; layer: `compositeMasked` слоя, затем blend на dest.
- Tools (Pattern / Trailing / Shape / Solid / SolidPattern): `useGpu` при selection, если есть `maskCanvas`.

## After

[`../baselines/04c-01-after.md`](../baselines/04c-01-after.md):

| | before | after layer | after stamp |
|---|---:|---:|---:|
| GPU path | — | `compositeLayerGpu`×842 | `stampGpu`×401 |
| `uploadGpu` | 156 | 2 | 1 |
| `downloadGpu` | — | 1 | 1 |
| `frame.interval` avg | 34.80 | 18.50 | 17.93 |

Критерий выполнен: GPU-span ≈ `draw.tool`; upload/download не на жест.

Единичный hitch ~467 ms — вне clip; диагностика → [`06-frame-hitches.md`](06-frame-hitches.md).

## Проверено

Frame Rec + непустое выделение:

- [x] layer (Shape/Solid): `compositeLayerGpu` ≈ `draw.tool`
- [x] stamp (кисть / pattern): `stampGpu` ≈ `draw.tool`
- [x] нет регулярного `downloadGpu` / `uploadGpu` на dest
- [ ] видео A←B + selection (не снимали; логика GPU-ahead та же, что 4b)

## Где смотреть

- Tools: `CanvasEventsService/ToolsServices/*` (`clipMask`, gate `useGpu`)
- [`GlContext`](../../../../src/gl/GlContext.ts) — `uploadClipMask`, `stampTextures`, `compositeCanvasOver`
- [`stamp.ts`](../../../../src/gl/stamp.ts) / [`composite.ts`](../../../../src/gl/composite.ts)

## Не входило

Построение selection ([`04c-10-selection-build.md`](04c-10-selection-build.md)), кисть Select ([`04c-06-brush-select-source.md`](04c-06-brush-select-source.md)), blend modes ([`04c-02-blend-modes.md`](04c-02-blend-modes.md)), hitch/GC ([`06-frame-hitches.md`](06-frame-hitches.md)).
