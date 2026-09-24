# 4c.16 — линия на WebGL

**Статус: закрыт** (2026-09-24). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). UI: линия «solid» (`ELineType.Solid`, [`lineSolid.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolid.tsx)).

## Было

Форму штриха считал Canvas: толщина, концы (`butt` / `round` / `square`), стыки (`bevel` / `round` / `miter`, предел остроты 10). Цвет в штрих не запекался. Видеокарта ставила копии белой формы и красила их.

В [4c.04](04c-04-helper-layer.md) форму оставили у Canvas. Здесь для сплошной линии это сменили.

## Сделано

Обводка сплошной линии — треугольники на видеокарте (`strokeMesh` / `strokeDraw`). Новый кусок дописывается в фигуру. Весь путь через Canvas не обводится. Концы и стыки те же три и три. Цвет «линия» и «кадр» — множитель. Повторы — тот же список копий ([4c.07](04c-07-repeating.md)).

Кисть shape и линия «фон» — отдельные задачи: [4c.18](04c-18-brush-shape-webgl.md), [4c.17](04c-17-line-back-webgl.md).

## Где

- [`lineSolid.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolid.tsx)
- [`strokeMesh.ts`](../../../../src/gl/strokeMesh.ts)
- [`strokeDraw.ts`](../../../../src/gl/strokeDraw.ts)
