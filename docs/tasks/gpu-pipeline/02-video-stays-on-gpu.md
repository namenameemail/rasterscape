# Этап 2 — видео остаётся на GPU

Сейчас `ShaderVideoModule` рисует в свой `glCanvas`, затем каждый кадр `canvasService.context.drawImage(glCanvas)`. Source Pattern: `sourcePattern.canvasService.getImageData()`. DEPTH-CF — то же с нескольких паттернов. Blur: StackBlur по полному `ImageData`.

Цель: выход шейдера = `PatternBuffer` (текстура). Чужой паттерн — `sampler2D`. Блюр — шейдер. Один общий `GlContext`.

Это главный выигрыш по кадру.

## Сделать

1. Общий `GlContext` на app. `ShaderVideoModule` не создаёт отдельный `glCanvas` на паттерн (или использует shared, пишет в FBO/текстуру буфера).
2. `onFrame`: `updateImage` → запись в `PatternBuffer`, не в 2D display context.
3. Presenter видимого паттерна blit’ит буфер (раз в кадр или по dirty).
4. `getFrameData` для `VideoSourceType.Pattern`: не `getImageData`. Текстура source-буфера (resize на GPU при несовпадении размера).
5. Камера: upload в текстуру (`texSubImage2D` / 3D stack как сейчас), без промежуточного полного 2D display.
6. DEPTH cut function: `texSubImage2D` с GPU-буферов источников, не `context.getImageData`.
7. Video blur: fragment shader вместо `StackBlur.imageDataRGBA` на каждый кадр. `blurOnce` в UI — тот же шейдер или редкий CPU, не hot path.
8. Platformer: `applyVideoFrame` берёт текстуру/канвас GPU-результата в world buffer без CPU roundtrip, если world ещё 2D — один `drawImage` с GL canvas, без `getImageData` source-паттерна.

## Где смотреть

- [`PatternVideoService.onFrame`](../../../src/store/patterns/_service/patternServices/PatternVideoService/index.ts) — `getFrameData`, `drawImage`, blur
- [`ShaderVideoModule`](../../../src/store/patterns/_service/patternServices/PatternVideoService/ShaderVideoModule/index.ts) — `glCanvas`, `pushNewFrame`, DEPTH `getImageData`
- [`PatternPlatformerService.applyVideoFrame`](../../../src/store/patterns/_service/patternServices/PatternPlatformerService/index.ts)
- [`blur/actions.ts`](../../../src/store/patterns/blur/actions.ts)

## Профиль «после»

Сценарий из [roadmap.md](roadmap.md): нет спана полного readback в `video.getFrameData`; нет CPU blur на кадр; FPS упирается в шейдер.

## Сломается, если ошибиться

Видео + platformer, видео + blur, source Pattern, cut function DEPTH, смена размера source, камера.

## Готово когда

- Скрытый B как source для A даёт живое видео без `getImageData` B на кадр.
- Blur radius > 0 не делает полный CPU roundtrip каждый кадр.
- Профиль сравним с эталоном этапа 0.

## Не входит

Кисти на GPU, отказ от `valuesService.updateMasked` (этап 3), cook graph.
