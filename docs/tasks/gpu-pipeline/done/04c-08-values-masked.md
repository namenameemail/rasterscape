# 4c.08 — masked / selected без лишнего скачивания

**Статус: закрыт** (2026-09-25). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). Код: `.masked` и `.selected` в [`PatternValuesService.ts`](../../../../src/store/patterns/_service/patternServices/PatternValuesService.ts).

## Было

Картинка с **маской** паттерна (`.masked`) и картинка с **выдел-ем** (`.selected`) часто собирались на процессоре. Даже если на видеокарте уже была свежая версия, код мог скачать весь буфер (`ensureCpu`).

После жеста на GPU снимок на процессоре мог отставать до отпускания мыши (`update()`).

Кисть / линия уже умели брать узор с GPU (`ensureMaskedGpu` / `ensureSelectedGpu`).

## Сделано

- `syncMaskedReference` только ссылается на canvas, без скачивания.
- CPU masked/selected собираются с `ensureCpu` и кэшем по `contentSerial` — без лишней пересборки.
- На кадре видео CPU selected не обновляется; GPU-путь через `ensureSelectedGpu`.
- Clipboard / cut / CPU-fallback кисти перед чтением явно обновляют снимок.

Превью — отдельно, [09](04c-09-preview.md).

## Где

- [`PatternValuesService.ts`](../../../../src/store/patterns/_service/patternServices/PatternValuesService.ts)
- [`selection/helpers.ts`](../../../../src/store/patterns/selection/helpers.ts)
- [`brushSelect.tsx`](../../../../src/store/patterns/_service/patternServices/CanvasEventsService/ToolsServices/brushSelect.tsx)
