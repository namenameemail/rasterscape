# Этап 5 — cook graph

Явно разделить cook (считать буфер) и present (показать на монитор).

Сейчас `frameScheduler` крутит всех подписчиков: каждое включённое видео и платформер, даже если паттерн скрыт и никто его не читает. Для live-source это нужно. Для «видео включили и забыли без потребителей» — лишние кадры.

Похоже на bypass / viewer vs cook в TouchDesigner.

## Сделать

1. Для паттерна флаги: `visible` (есть presenter), `updatingOn` / `playingOn`, `isSource` (кто-то семплит этот буфер: video source, DEPTH, brush pattern, platformer bg/player).
2. Cook video, если `updatingOn` **и** (`visible` или `isSource` или явный «всегда cook»). Иначе не подписывать `video:{id}` на `frameScheduler`.
3. То же для platformer `playingOn`.
4. Present только при `visible` (и dirty / каждый кадр если cook идёт).
5. При появлении потребителя (выбрали source pattern) — cook source возобновляется, буфер актуален (не чёрный кадр на старте: один sync cook).
6. Не останавливать буфер при скрытии слота, если `isSource`.

## Где смотреть

- [`FrameScheduler`](../../../src/utils/FrameScheduler.ts)
- [`PatternVideoService.start/stop`](../../../src/store/patterns/_service/patternServices/PatternVideoService/index.ts)
- [`patternHasBackgroundActivity`](../../../src/store/patterns/selectors.ts) — точка навбара должна учитывать cook, не только «слот виден»
- video `sourcePatternId`, platformer background/player ids, tool pattern ids

## Сломается, если ошибиться

Скрытый source «замирает»; точка activity врёт; первый кадр после выбора source пустой; demonstration.

## Готово когда

- Скрытое видео без потребителей не ест кадр.
- Скрытый source для видимого видео cook’ается.
- Переключение видимости не требует `display:none` как способа сохранить пиксели (это уже этап 1).

## Не входит

Сеть операторов как в TD, CHOPs, автоматический граф всех CF.
