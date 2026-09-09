# 4c.14 — платформер: сборка кадра и tools → world

Сейчас: `refreshDisplay` собирает кадр в 2D и `presentFromCpu`. Пока platformer playing, инструменты пишут в world 2D, не в GPU dest паттерна.

## Сделать

Показ платформера с меньшим CPU; жесты в world без принуждения main `PatternBuffer` к CPU (world может остаться отдельным буфером — тогда его путь к экрану удешевить).

## Где

- `PatternPlatformerService` / renderer
- `CanvasEventsService.buildToolEvent` (platformer world context)

## Готово когда

Игра + отрисовка: меньше `presentFromCpu` / upload полного dest на тик; кисть в world не ломает GPU-ahead основного буфера зря.
