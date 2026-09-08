# Этап 1 — буфер не в CSS

Пиксели паттерна не хранятся в видимом канвасе на странице. Этот канвас только **показывает** видимый паттерн. Скрытый паттерн имеет буфер, на экране его нет.

Поведение редактора снаружи то же. Выигрыш: нет layout скрытых канвасов; GPU-слой не зависит от `display: none` / `visibility`.

Этап сам по себе не убирает `getImageData` из видео. Кадр как в TD дешевеет на этапе 2.

## Сделать

1. Реализовать `PatternBuffer` (OffscreenCanvas 2D **или** GL-текстура). На этом этапе допустим OffscreenCanvas / скрытый 2D, если GL ещё не общий — главное: не CSS-слот.
2. `PatternCanvasService` пишет/читает буфер, не «тот canvas, что на экране».
3. `bindCanvas` на DOM-элементе = повесить **монитор**, не заменить хранилище пикселей. Снять канвас с экрана не должно уничтожать картинку (сейчас `resetCanvasElement` сохраняет `_imageData` только если вызвать `setCanvas()` без аргумента; компонент при `null` ничего не делает).
4. Скрытый слот: монитор не обязателен. Активный (позже — несколько на экране) — скопировать буфер на видимый канвас.
5. Mask Area — второй такой же буфер, свой монитор когда маска видна.
6. Resize / load / undo пишут в буфер, потом на экран, если монитор есть.

## Где смотреть

- [`PatternService.bindCanvas`](../../../../src/store/patterns/_service/PatternService.ts)
- [`PatternCanvasService`](../../../../src/store/patterns/_service/patternServices/PatternCanvasService.ts) — `setCanvas` / `_imageData`
- [`Pattern/index.tsx`](../../../../src/components/Pattern/index.tsx) — `handleCanvasRef`, mask Area
- [`patternWorkspace.scss`](../../../../src/styles/patternWorkspace.scss) — слоты

## Сломается, если ошибиться

`bindCanvas`, resize, undo/redo, load image, mask canvas, demonstration `captureStream` (стримить видимый канвас на экране).

## Готово когда

- Переключение A↔B не теряет пиксели B.
- Нет привязки «живой bitmap = DOM node слота».
- Undo/load/resize работают.
- Скрытый паттерн можно прочитать через сервис (`getImageData` с буфера ещё ок).

## Не входит

Видео: не убирать `getImageData` с каждого кадра (это этап 2). GPU-блюр, перепись кистей, «считать только если нужно».

---

## Закрыто

Дата: 2026-09-08. Ветка `gpu-pipeline`.

### Что стало

`PatternBuffer` — класс, а не тип: [`PatternBuffer.ts`](../../../../src/store/patterns/_service/patternServices/PatternBuffer.ts). Внутри `document.createElement('canvas')` (не в DOM) + свой контекст, плюс необязательный **монитор** — видимый `<canvas>`. Методы: `setSize`, `readPixels`, `writePixels`, `setMonitor`, `present`. GL-текстуры здесь нет, это этап 2.

Полей `dirty` / `cpuCache` из наброска этапа 0 нет: писать в буфер можно мимо его API (видео, платформер, кисти пишут прямо в `context`), поэтому кэш снимка врал бы. Вернутся вместе с GL-буфером.

`PatternCanvasService` (и наследник `PatternMaskService`) хранит `buffer`, а `canvas` / `context` стали геттерами на буфер. Поэтому весь чужой код (`fxy`, selection, tools, `toDataURL`, платформер-рендерер) не менялся и теперь читает буфер, в том числе у скрытого паттерна. `_imageData`, `setSavedImageData`, `setCanvasElement`, `resetCanvasElement`, `getCanvas`, `getContext` удалены.

`setCanvas(monitor?, width?, height?)` = повесить или снять монитор. Пиксели при снятии не трогаются.

### Мышь и пиксели разошлись

`CanvasEventsService.bindCanvas(monitor, buffer)`: слушатели, `getOffset`, `requestPointerLock` — на мониторе; `buildToolEvent` отдаёт инструментам контекст и канвас **буфера**.

### Кто зовёт present

- `PatternCanvasService.setImageData` — undo, load, resize, блюр, room
- `PatternToolService` — все четыре хендлера канваса и маски
- `PatternVideoService.onFrame` после `drawImage` кадра шейдера
- `PatternPlatformerService.refreshDisplay`, `stop` через `setImageData`

Спан [`canvas.present`](../../../../src/store/patterns/_service/patternServices/PatternBuffer.ts) — новая строка в профиле.

### Монитора у скрытого слота нет

`Patterns.tsx` отдаёт `Pattern` проп `visible`; `Pattern.syncMonitors` вешает монитор только когда `visible || demonstration` (демонстрация — чтобы `captureStream` не замёрз при переключении активного). Ref со значением `null` теперь тоже доходит до сервиса: `bindCanvas` / `bindMaskCanvas` умеют отвязывать.

Из-за этого у скрытого паттерна с живым видео `present` не вызывается вообще — иначе этап 1 добавил бы блит целого кадра там, где раньше его не было.

### Экран больше не читают

`CanvasLight` на mouseup звал `canvasToImageData` с DOM-канваса и отдавал результат в `updateImage`. Монитор — копия, писать её обратно в буфер нельзя (гонка с `present`). Теперь `onChange()` без аргументов, `updateImage({id})` и `updateMask(id)` берут пиксели из сервиса.

### Проверено

`tsc -b` и `vite build` проходят (ошибки строгости в файлах были и до этапа). Живая проверка вручную: A↔B без потери пикселей, кисть, маска, resize, undo/redo, load, платформер, видео с source-паттерном.

### Следующая задача

[`02-video-stays-on-gpu.md`](../02-video-stays-on-gpu.md) — там и падает FPS: `video.source.getImageData` 15.4 ms на 1080p по эталону [`00-before-1080.md`](../baselines/00-before-1080.md).
