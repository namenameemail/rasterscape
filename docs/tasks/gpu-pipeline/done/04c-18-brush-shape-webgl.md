# 4c.18 — кисть shape на WebGL

**Статус: закрыт** (2026-09-24). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). UI: кисть shape (`EBrushType.Shape`, [`brushForm.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushForm.tsx)).

## Было

Каждый кадр круг рисовался на 2D-холсте размера всей картинки, по точке на каждый повтор. Потом холст целиком заливался на видеокарту.

В [4c.04](04c-04-helper-layer.md) круг оставили у Canvas. Здесь это сменили.

## Сделано

Круг ставится на видеокарте сразу в картинку паттерна: место, радиус, цвет (`stampCircles` / `CIRCLE_FS`). Холст размера картинки для этого не нужен.

Повторы — те же точки. Обрезка по выделению и режим наложения те же, что у штампа.

## Где

- [`brushForm.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushForm.tsx)
- [`circleStamp.ts`](../../../../src/gl/circleStamp.ts)
