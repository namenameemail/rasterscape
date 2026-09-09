# 4c.09 — превью паттерна на CPU

Сейчас: `PatternPreviewService` тянет полный буфер на CPU (letterbox + mask), с throttle.

## Сделать

Превью 40×40 (или текущий размер) downsample с GPU-текстуры, без полного `ensureCpu` буфера на каждый refresh.

## Где

- `PatternPreviewService.ts`

## Готово когда

Обновление превью не делает регулярный `downloadGpu` полного dest.
