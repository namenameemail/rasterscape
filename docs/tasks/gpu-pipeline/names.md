# Имена в задачах GPU-пайплайна

Чтобы в `04c/*` и чатах не путать похожие слова.

## Как писать

В заголовке и «Сейчас» — **как в UI** (RU из `translations/ru/common.json`, при необходимости EN в скобках).  
Рядом в backticks — **id в коде** (`EBrushType.Select`, `selectionService.mask`).

Пример: «кисть | select» (`EBrushType.Select`) — не «Brush select» без пояснения и не просто «выделение».

## Частые пары (не путать)

| UI (RU) | Код | Что это |
|---------|-----|---------|
| **выдел-е** (панель инструментов) | `EToolType.Select`, `SelectTool`, `selectionService` | Область на паттерне. Даёт `mask` / `maskCanvas`. |
| **выдел-е** (тип кисти!) | `EBrushType.Select`, `brushSelect.tsx` | В UI то же слово «выдел-е», но это **режим кисти**: штампует пиксели из выделения. В задачах писать «кисть \| выдел-е» + `EBrushType.Select`. |
| **кисть → shape / pattern** | `EBrushType.Shape` / `Pattern` | Круг/квадрат или штамп другого паттерна. |
| **линия → фон** | `ELineType.SolidPattern` («back» в EN) | Сплошная линия с `createPattern`. |
| **линия → кисть** | `ELineType.TrailingPattern` | Trailing pattern stamps. |
| **маска** (паттерна) | `maskService`, mask-слой | Отдельный буфер маски паттерна, не selection. |
| **режим наложения \| обычный** | `source-over` | Happy-path GPU в 4b. Остальные — [04c/02](04c/02-blend-modes.md). |

## Сценарии в задачах (не названия кнопок)

| Формулировка в задаче | Имеется в виду |
|----------------------|----------------|
| **Обрезка штриха по выделению** | Любой инструмент рисования + **непустое** `selectionService.mask` → штрих клипится (`drawMasked`). Это **не** «кисть \| select». |
| **Жест** | Тянешь мышь / pen с зажатой кнопкой (кадры `onDraw`), не click-once. |
| **dest** | Буфер паттерна, в который пишем (`PatternBuffer` canvas-слоя). |
| **source** | Паттерн/текстура, откуда штамп (другой pattern id, `.masked`, `.selected`). |

## Куда ссылаться

Оглавление подзадач: [`04c/README.md`](04c/README.md).  
Этот файл — договорённость по именам для всех `docs/tasks/gpu-pipeline/**`.
