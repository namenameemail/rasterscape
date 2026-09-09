# 4c.10 — построение маски выделения

Сейчас: Path2D → canvas → `getImageData` в `PatternSelectionService` (CPU ImageData для clip и UI).

## Сделать

Держать selection mask как текстуру (или canvas без полного `getImageData`, пока не нужен CPU). Потребители жеста — [01](01-selection-clip.md).

## Где

- `PatternSelectionService.ts`
- `selection/helpers.ts`

## Готово когда

Смена selection не обязана снимать полный ImageData, если дальше только GPU-clip.

## Не входит

Clipboard cut, которому нужен ImageData — ок оставить съём.
