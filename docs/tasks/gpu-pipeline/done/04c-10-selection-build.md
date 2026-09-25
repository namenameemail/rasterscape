# 4c.10 — построение маски выделения

**Статус: закрыт** (2026-09-25). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). Потребители жеста — [`04c-01-selection-clip.md`](04c-01-selection-clip.md).

## Было

Path2D → canvas → сразу `getImageData` в `PatternSelectionService` (CPU ImageData для clip и UI).

## Сделано

Маска выделения держится как canvas (`maskCanvas`). Полный `getImageData` — только через `ensureMaskCpu`, когда CPU реально нужен. GPU-clip и жесты берут canvas, без съёма на каждую смену выделения.

Clipboard cut с ImageData — по-прежнему съём по делу (не входило в задачу).

## Где

- [`PatternSelectionService.ts`](../../../../src/store/patterns/_service/patternServices/PatternSelectionService.ts)
- [`selection/helpers.ts`](../../../../src/store/patterns/selection/helpers.ts)
