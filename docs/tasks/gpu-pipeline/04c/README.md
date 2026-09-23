# 4c — оставшийся CPU в пайплайне

После 4a/4b обычный штрих (source-over, без выделения) уже на GPU.

Ниже — **отдельные места**, где картинка всё ещё идёт через 2D / скачивание с GPU. Каждое — своя подзадача, можно брать по одной.

Имена UI ↔ код: [`../names.md`](../names.md) (например «обрезка по выделению» ≠ «кисть \| select»).

Этап 5 ([`../05-cook-graph.md`](../05-cook-graph.md)) параллельно: «считать кадр или нет», не «где пиксели».

**Закрытие подзадачи:** дописать After/проверку → перенести файл в [`../done/04c-NN-….md`](../done/) → в таблице ниже ссылка на `done`, не на живой `04c/`.

## Подзадачи

### Пока рисуешь

| # | Задача | Суть |
|---|--------|------|
| [01](../done/04c-01-selection-clip.md) | Обрезка штриха по выделению | **закрыт** — stamp+layer GPU clip; [`../baselines/04c-01-after.md`](../baselines/04c-01-after.md) |
| [02](../done/04c-02-blend-modes.md) | Режимы наложения | **закрыт** — шейдерный blend на все режимы селекта, stamp и layer |
| [03](../done/04c-03-mask-draw.md) | Рисование в маску паттерна | **закрыт** — жест по маске на GPU, без скачивания картинки паттерна |
| [04](../done/04c-04-helper-layer.md) | Черновик штриха на весь кадр | **закрыт** — shape / solid / «фон» остаются на 2D-холсте размера картинки: GPU-аналог не совпадёт с Canvas |
| [05](05-line-back-source.md) | Линия «фон»: картинка узора | штрих как сейчас; узор не скачивать с GPU на каждый кадр |
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
