# Платформер — GPU / CPU

Было в [`../gpu-pipeline/04c/`](../gpu-pipeline/04c/README.md) как 4c.12–15. Вынесено отдельно: это не happy-path рисования паттерна, а путь мира платформера.

Словарь имён пайплайна: [`../gpu-pipeline/names.md`](../gpu-pipeline/names.md). Опись оставшихся копий на кадре: [`hot-path-copies.md`](hot-path-copies.md) (из gpu-pipeline перенесено сюда).

**Закрытие:** статус + дата → `done/` → строка в таблице на `done`, запись в [`../log.md`](../log.md).

## Подзадачи

| # | Задача | Суть |
|---|--------|------|
| [01](01-video-to-world.md) | Видео → world | `drawImage` в мир каждый кадр (было 4c.12) |
| [02](02-blur.md) | Blur мира | CPU blur по кадру (было 4c.13) |
| [03](03-display.md) | Сборка кадра и tools | 2D + `presentFromCpu`; кисть в world (было 4c.14) |
| [04](04-collision.md) | Коллизии | `getImageData` мира когда dirty (было 4c.15) |

## Порядок

Логично подряд: 01 → 03 (world на экране/GPU) ↔ 02 blur; 04 можно параллельно.
