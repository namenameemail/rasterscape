# 4c.03 — рисование в маску паттерна

**Статус: закрыт** (2026-09-23). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). Это слой **маски паттерна** (`maskService`), не обрезка по выделению.

## Было

Жест по маске всегда скачивал картинку на процессор (`ensureCpu`), рисовал в 2D и каждый кадр заливал её обратно (`presentFromCpu`). При живом видео это ещё и скачивало сам паттерн: инструменты целились в `canvasService.buffer`, а не в буфер маски.

## Сделано

- Жест пишет в тот буфер, на котором он идёт: паттерн или маска (`bufferForDrawCanvas`).
- Маска идёт тем же GPU-путём, что паттерн: stamp / composite, показ через `presentGl`.
- Скачивание картинки паттерна на кадре жеста по маске убрано.
- Если есть выделение (`selectionService.maskCanvas`), штрих по маске обрезается им на GPU так же, как штрих по паттерну. Кисть «выдел-е» (`EBrushType.Select`) по-прежнему без этой обрезки.

## Где

- [`drawTarget.ts`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/drawTarget.ts)
- [`PatternToolService.ts`](../../../../src/store/patterns/_service/patternServices/PatternToolService.ts) — `presentMaskToolResult`
- Tools: `CanvasEventsService/ToolsServices/*`
