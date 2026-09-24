# 4c.05 — линия «фон»: откуда берётся узор

**Статус: закрыт** (2026-09-23). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). UI: линия «фон» (`ELineType.SolidPattern`, в EN back).

Сама линия остаётся на 2D-холсте размера картинки. Это решение в [`04c-04-helper-layer.md`](04c-04-helper-layer.md): форма штриха из Canvas, на GPU её не подменяем.

## Было

Каждый кадр жеста `updateMaskedIfNeeded(true)` у паттерна-узора. Без маски это `ensureCpu`: скачать всю картинку, если она уже на видеокарте. Из `.masked` делали `createPattern` и им обводили линию.

## Сделано

На GPU-пути штрих по-прежнему `stroke()` на холсте (белая обводка — только форма). Цвет берётся из `ensureMaskedGpu` тем же сдвигом, что у `createPattern`: центр на мыши, поворот, масштаб. Несколько указателей складываются по своим матрицам, затем тот же проход, что у обычной линии.

Если текстуры нет или масштаб узора нулевой, остаётся `createPattern` по `.masked`.

## Где

- [`lineSolidPattern.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/lineSolidPattern.tsx)
- [`linePattern.ts`](../../../../src/gl/linePattern.ts)
- [`patternFill.ts`](../../../../src/gl/patternFill.ts)

Общий CPU-снимок `.masked` для превью и прочего — отдельно, [08](../04c/08-values-masked.md).
