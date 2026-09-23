# 4c.04 — черновик штриха на весь кадр

**Статус: закрыт** (2026-09-23). Перенесено из `04c/` → `done/`. Код не меняли.

Словарь: [`../names.md`](../names.md).

## Что это

Кисть shape, линия solid и линия «фон» рисуют фигуру на 2D-холсте размера всей картинки, потом заливают этот холст в текстуру (`compositeLayerGpu`). Круг в 20 пикселей на 1080p всё равно тащит пустой кадр.

| Инструмент | UI | Код |
|---|---|---|
| Кисть, круглая | shape | [`brushForm.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushForm.tsx) |
| Линия сплошная | solid | [`lineSolid.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolid.tsx) |
| Линия с узором | «фон» / back | [`lineSolidPattern.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolidPattern.tsx) |

Кисть pattern и линия «кисть» так не делают: маленькие штампы сразу в текстуру (`stampGpu`).

## Решение

Оставить helper на весь кадр.

Форма этих штрихов — из Canvas2D: круг, `stroke()` с концами (`butt` / `round` / `square`) и стыками (`bevel` / `round` / `miter`, предел остроты по умолчанию 10), у «фона» ещё заливка `createPattern` со сдвигом и поворотом. Путь линии копится с начала жеста и каждый кадр обводится целиком.

GPU-лента или штамп дадут похожую линию, не ту же: сглаживание краёв и острые углы разъедутся. Ради дешёвого кадра форму не подменяем.

Полный холст остаётся ценой точного штриха. Ужимать его до прямоугольника штриха тоже не делаем: это отдельная оптимизация заливки, не замена геометрии, и в этот заход она не входит.
