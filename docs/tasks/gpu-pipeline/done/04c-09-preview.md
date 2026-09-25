# 4c.09 — превью паттерна без полного скачивания

**Статус: закрыт** (2026-09-25). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). UI: миниатюры в выборе паттерна (`PatternsSelect` → `bindPreview`) и channel-превью в Depth CF (`bindChannelPreview`). Код: [`PatternPreviewService.ts`](../../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts), [`preview.ts`](../../../../src/gl/preview.ts).

## Было

Каждое обновление превью:

1. `ensureCpu()` — если картинка уже на видеокарте, скачивается **весь** буфер паттерна (`canvas.downloadGpu`, размер как у dest: часто 1080p).
2. На процессоре letterbox в маленький canvas (обычно ~40×40) и при включённой **маске** — 2D `compositeMasked`.

Превью дергают при смене маски / картинки и по таймеру **раз в 400 ms**, пока идёт видео или платформер (`autoUpdate`). Открыт селект паттернов или Depth — платишь полным скачиванием, хотя на экран уходят десятки пикселей.

Список паттернов в панели проектов (`ProjectPatternPreviews`) — другой путь (готовые `ImageData`). Эта задача его не трогает.

## Сделано

- Downsample + letterbox (+ маска) на видеокарте в размер миниатюры.
- В 2D-canvas через FBO + `readPixels` только пиксели ~40×40 (alpha сохраняется — виден цвет кнопки под канвасом).
- Регулярного `downloadGpu` полного dest из-за превью нет.

## Где

- [`PatternPreviewService.ts`](../../../../src/store/patterns/_service/patternServices/PatternPreviewService.ts)
- [`preview.ts`](../../../../src/gl/preview.ts)
