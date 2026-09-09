# 4c.03 — рисование в маску паттерна

Сейчас: жест по mask-слою всегда `ensureCpu` + 2D + `presentFromCpu`.

## Сделать

Писать в текстуру маски на GPU (stamp/composite), без скачивания на каждый кадр жеста.

## Где

- `CanvasEventsService` (`isMask` → `ensureCpu`)
- `PatternToolService.maskCanvasEventHandlers`
- mask `PatternBuffer`

## Готово когда

Жест по маске при живом видео dest: нет регулярного `downloadGpu` из-за mask draw.
