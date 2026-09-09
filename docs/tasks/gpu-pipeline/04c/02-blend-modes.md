# 4c.02 — режимы наложения не source-over

Сейчас: не «normal» (source-over) → весь инструмент снова 2D + `ensureCpu`.

## Сделать

Либо нужные blend modes на GPU, либо в доке явно: «эти режимы всегда 2D» (и не портить GPU-dest молча).

## Где

- `ToolsServices/*` (`compositeOperation !== SourceOver`)
- `store/compositeOperations`

## Готово когда

Либо GPU без download на жест, либо задокументированный вечный 2D-путь без сюрпризов при видео.
