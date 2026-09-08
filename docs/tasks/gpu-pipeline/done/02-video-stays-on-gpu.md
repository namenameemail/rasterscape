# Этап 2 — видео остаётся на GPU

Сейчас `ShaderVideoModule` рисует в свой `glCanvas`, затем каждый кадр `canvasService.context.drawImage(glCanvas)`. Source Pattern: `sourcePattern.canvasService.getImageData()`. DEPTH-CF — то же с нескольких паттернов. Blur: StackBlur по полному `ImageData`.

Цель: выход шейдера = `PatternBuffer` (текстура). Чужой паттерн — `sampler2D`. Блюр — шейдер. Один общий `GlContext`.

Это главный выигрыш по кадру.

## Сделать

1. Общий `GlContext` на app. `ShaderVideoModule` не создаёт отдельный `glCanvas` на паттерн (или использует shared, пишет в FBO/текстуру буфера).
2. `onFrame`: `updateImage` → запись в `PatternBuffer`, не в 2D display context.
3. Видимый паттерн: каждый кадр (или когда картинка изменилась) скопировать буфер на канвас на экране.
4. `getFrameData` для `VideoSourceType.Pattern`: не `getImageData`. Текстура source-буфера (resize на GPU при несовпадении размера).
5. Камера: upload в текстуру (`texSubImage2D` / 3D stack как сейчас), без промежуточного полного 2D display.
6. DEPTH cut function: `texSubImage2D` с GPU-буферов источников, не `context.getImageData`.
7. Блюр видео: шейдер, не StackBlur по всей картинке **каждый кадр**. Кнопка «блюр один раз» в меню может остаться редким проходом на процессоре.
8. Platformer: `applyVideoFrame` берёт текстуру/канвас GPU-результата в world buffer без CPU roundtrip, если world ещё 2D — один `drawImage` с GL canvas, без `getImageData` source-паттерна.

## Где смотреть

- [`PatternVideoService.onFrame`](../../../../src/store/patterns/_service/patternServices/PatternVideoService/index.ts) — `getFrameData`, `drawImage`, blur
- [`ShaderVideoModule`](../../../../src/store/patterns/_service/patternServices/PatternVideoService/ShaderVideoModule/index.ts) — `glCanvas`, `pushNewFrame`, DEPTH `getImageData`
- [`PatternPlatformerService.applyVideoFrame`](../../../../src/store/patterns/_service/patternServices/PatternPlatformerService/index.ts)
- [`blur/actions.ts`](../../../../src/store/patterns/blur/actions.ts)

## Профиль «после»

Сценарий из [roadmap.md](../roadmap.md): в профиле нет съёма всей картинки в `video.getFrameData`; нет блюра на процессоре каждый кадр; FPS упирается в шейдер.

## Сломается, если ошибиться

Видео + platformer, видео + blur, source Pattern, cut function DEPTH, смена размера source, камера.

## Готово когда

- Скрытый B как source для A даёт живое видео без `getImageData` B на кадр.
- Blur radius > 0 не делает полный CPU roundtrip каждый кадр.
- Профиль сравним с эталоном этапа 0.

## Не входит

Кисти на GPU, убрать `updateMasked` с кадра видео (этап 3), этап 5.

---

## Закрыто

Дата: 2026-09-08. Ветка `gpu-pipeline`.

Из кода кадра видео убрали `getImageData`. FPS не вырос: та же копия 1080p уехала в `texSubImage3D`. Общий GL и текстура буфера — в этап 4.

### Сделано здесь

- **4.** `getFrameData` → `getFrameSource`: канвас, не `Uint8ClampedArray`. `pushNewFrame` льёт его в `texSubImage3D` как `TexImageSource`. Размер не совпал — `video.source.scale` (`drawImage`), не `resizeImageData`.
- **5.** Камера: `cameraService.receiveImage()` вместо `receiveImageData()`.
- **6.** DEPTH: `texSubImage2D` с канвасов паттернов, спан `video.depth.texture`. Починен `paramTextures[i].width/height` — раньше не обновлялись, при другом размере каждый кадр шёл полный `texImage2D`.
- **7.** Блюр кадра: `filter: blur()` ([`blur.ts`](../../../../src/utils/canvas/helpers/blur.ts)), не StackBlur + `getImageData`. Радиус StackBlur → sigma как `r / 2`, картинка не пиксель-в-пиксель. Кнопка разового блюра в `blur/actions` осталась на процессоре.
- **8.** `applyVideoFrame` и так брал GL-канвас; `applyBlurToWorld` — тот же GPU-блюр.
- **2, 3.** Закрыты этапом 1: шейдер пишет в буфер, на экран — только видимый.

`UNPACK_COLORSPACE_CONVERSION_WEBGL = NONE` — загрузка канваса не должна съезжать по цвету относительно старого массива.

### Замер

[`baselines/02-after.md`](../baselines/02-after.md) vs [`01-after.md`](../baselines/01-after.md), 1080p:

| | этап 1 | этап 2 |
|--|-------:|-------:|
| `video.source.getImageData` | 14.2 ms | нет |
| `video.getFrameData` | 14.23 | **0.01** |
| `video.pushNewFrame` | 1.68 | **16.74** |
| `values.updateMasked` | 41.5 | 45.5 |
| `frame.interval` | 34.2 (~29 FPS) | 48.5 (~21 FPS), пик 2018 |

Критерий «нет съёма в `getFrameData`» выполнен. «FPS упирается в шейдер» — нет: шейдер 0.02 ms, кадр держит заливка 2D-канваса в 3D-текстуру.

### Ушло в следующие задачи

- [`04-tools.md`](../04-tools.md): общий `GlContext`, буфер = GL-текстура, шейдер пишет в FBO, source/DEPTH = `sampler2D` без `texSubImage` с 2D, блюр-шейдер в том же контексте.
- [`03-masked-preview.md`](03-masked-preview.md) — закрыт: `updateMasked` 45 ms → 0.1 ms.

### Следующая задача

[`04-tools.md`](../04-tools.md).
