# 4c — оставшийся CPU в пайплайне

После 4a/4b обычный штрих (source-over, без выделения) уже на GPU.

Ниже — **отдельные места**, где картинка всё ещё идёт через 2D / скачивание с GPU. Каждое — своя подзадача, можно брать по одной.

Имена UI ↔ код: [`../names.md`](../names.md) (например «обрезка по выделению» ≠ «кисть \| select»).

Этап 5 ([`../05-cook-graph.md`](../05-cook-graph.md)) параллельно: «считать кадр или нет», не «где пиксели».

## Подзадачи

### Пока рисуешь

| # | Задача | Суть |
|---|--------|------|
| [01](01-selection-clip.md) | Обрезка штриха по выделению | **в работе / код:** GPU clip; ждать профиль after |
| [02](02-blend-modes.md) | Не source-over | multiply и т.п. → снова 2D |
| [03](03-mask-draw.md) | Рисование в маску паттерна | mask-слой всегда CPU |
| [04](04-helper-layer.md) | Helper перед GPU | Shape/Solid сначала полный 2D-слой |
| [05](05-line-back-source.md) | Line «фон» / back fill | `createPattern` с CPU `.masked` |
| [06](06-brush-select-source.md) | Кисть \| выдел-е (`EBrushType.Select`) | upload CPU `.selected` |
| [07](07-repeating.md) | Repeating | сетка на 2D-пути |

### Values / UI

| # | Задача | Суть |
|---|--------|------|
| [08](08-values-masked.md) | masked / selected | 2D-композит и sync с GPU-ahead |
| [09](09-preview.md) | Превью | полный буфер на CPU |
| [10](10-selection-build.md) | Построение selection | Path2D → `getImageData` |

### Кадр / экран / платформер

| # | Задача | Суть |
|---|--------|------|
| [11](11-present.md) | Показ на монитор | blit + `drawImage` каждый кадр |
| [12](12-platformer-video.md) | Видео → world | `drawImage` в мир платформера |
| [13](13-platformer-blur.md) | Blur мира | CPU blur по кадру |
| [14](14-platformer-display.md) | Сборка кадра платформера | 2D + `presentFromCpu`; tools в world |
| [15](15-platformer-collision.md) | Коллизии | `getImageData` мира когда dirty |

## Не трогаем (ок на CPU)

История / undo, сейв PNG, clipboard, кнопка `blurOnce`, init/stop platformer, resize, камера `texSubImage3D`.

## Порядок

Не жёсткий. Логичные пары: 01↔10, 05↔08, 12–15 подряд. 11 — по профилю `present`.
