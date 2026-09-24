# 4c.06 — кисть | выдел-е: источник штампа

**Статус: закрыт** (2026-09-23). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md).  
В UI тип кисти тоже называется «выдел-е» — это `EBrushType.Select` (штамп пикселей из области), не обрезка любого штриха — то [`04c-01-selection-clip.md`](04c-01-selection-clip.md).

## Было

На каждый кадр жеста штамп мог брать CPU-снимок `.selected` и заливать его в текстуру заново. Маска выделения тоже уходила на видеокарту каждый кадр, хотя само выделение не менялось.

## Сделано

На GPU-пути штамп берётся из `ensureSelectedGpu`: картинка паттерна и маска выделения собираются на видеокарте. Холст маски заливается один раз, когда выделение меняется. Пока картинка паттерна та же, готовый штамп не пересобирается.

Если текстуры нет, остаётся прежний путь через `.selected`.

## Где

- [`brushSelect.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushSelect.tsx)
- [`PatternValuesService.ts`](../../../../src/store/patterns/_service/patternServices/PatternValuesService.ts) — `ensureSelectedGpu`
- [`PatternSelectionService.ts`](../../../../src/store/patterns/_service/patternServices/PatternSelectionService.ts) — номер версии выделения
