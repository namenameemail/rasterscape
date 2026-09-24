# 4c.17 — линия «фон» на WebGL

**Статус: закрыт** (2026-09-24). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). UI: линия «фон» (`ELineType.SolidPattern`, в EN back, [`lineSolidPattern.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolidPattern.tsx)).

## Было

Форму считал Canvas: на каждую точку повтора свой холст размера картинки. Каждый кадр холст очищался и весь путь обводился заново. Концы и стыки те же, что у сплошной линии.

Узор уже брался с видеокарты ([4c.05](04c-05-line-back-source.md)). Белая обводка только вырезала, куда положить узор.

В [4c.04](04c-04-helper-layer.md) форму оставили у Canvas. Здесь для линии «фон» это сменили. Пиксель в пиксель не обещали.

## Сделано

Обводка — треугольники на видеокарте, тем же штрихом, что в [4c.16](04c-16-line-webgl.md). Новый кусок дописывается в фигуру. Холст клетки на каждый кадр не очищается и не заливается на видеокарту.

Узор кладётся в эту фигуру как раньше: центр на точке, поворот, масштаб. Если текстуры узора нет — запасной путь через `createPattern`.

Повторы — те же точки.

## Где

- [`lineSolidPattern.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolidPattern.tsx)
- [`patternFill.ts`](../../../../src/gl/patternFill.ts)
- [`strokeMesh.ts`](../../../../src/gl/strokeMesh.ts), [`strokeDraw.ts`](../../../../src/gl/strokeDraw.ts)
