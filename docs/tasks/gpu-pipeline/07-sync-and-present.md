# Этап 7 — один смысл «где свежая картинка» и один present

Словарь: [`names.md`](names.md). Код: [`PatternBuffer.ts`](../../../src/store/patterns/_service/patternServices/PatternBuffer.ts), [`PatternToolService.ts`](../../../src/store/patterns/_service/patternServices/PatternToolService.ts).

Не про скорость present ([4c.11](done/04c-11-present.md) уже ок). Про то, чтобы флаги и ветки показа не ломались при правках.

## Сейчас (после правок)

- Sync только через `afterCpuWrite` / `afterGpuDraw` / `afterGpuUpload` / `afterCpuDownload`.
- При `ensureGpu` upload с канваса сразу нормализуется в GL-ориентацию (blit flip) → `textureFromCanvas` всегда false, `stampFlipY` всегда true; premul отдельно (`texturePremul`).
- Present после жеста: `isGpuAhead` → `presentGl`, иначе `presentFromCpu`. `drewGpu` убран.

## Было

В буфере три независимых флага:

- `gpuInSync` / `cpuInSync` — где свежая картинка
- `gpuFromCanvas` (`textureFromCanvas`) — как перевёрнута текстура (из 2D-канваса или уже «как GL»)

Их выставляли почти все методы буфера. Снаружи ещё `stampFlipY` у masked/selected и `drewGpu` у инструментов.

Показ после жеста — три ветки: `drewGpu` / `gpuAhead` / `fromCpu`.

## Что улучшить

1. **Один контракт у буфера** — сделано (хелперы выше).
2. **Ориентация текстуры** — сделано: нормализация при upload; сэмпл с буфера всегда GL (`stampFlipY`).
3. **Один вход показа** — сделано: ветка по `isGpuAhead`, без `drewGpu`.

## Когда готово

- Present после жеста и на кадре видео идёт через один путь; `drewGpu` не выбирает ветку.
- Смена sync/flipY только через операции буфера.
- Ручная проверка без зеркала и без «старого кадра поверх»: видео; кисть pattern; линия «фон»; рисование в маску; жест при `isGpuAhead` + отпускание мыши.
- FPS / Present не цель; регрессия по Rec ок, если не хуже заметно.

## Не входит

Общий scratch GL, video+draw в один dest, кэш `ensureMaskedGpu`, платформер, undo/сейв.
