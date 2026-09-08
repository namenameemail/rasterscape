# Этап 1 — буфер не в CSS

Пиксели паттерна не хранятся в видимом DOM-канвасе. DOM-canvas — presenter только у видимого паттерна. Скрытый паттерн имеет буфер, монитора нет.

Поведение редактора снаружи то же. Выигрыш: нет layout скрытых канвасов; GPU-слой не зависит от `display: none` / `visibility`.

Этап сам по себе не убирает `getImageData` из видео. Кадр как в TD дешевеет на этапе 2.

## Сделать

1. Реализовать `PatternBuffer` (OffscreenCanvas 2D **или** GL-текстура). На этом этапе допустим OffscreenCanvas / скрытый 2D, если GL ещё не общий — главное: не CSS-слот.
2. `PatternCanvasService` пишет/читает буфер, не «тот canvas, что на экране».
3. `bindCanvas` на DOM-элементе = подключить **Presenter**, не заменить хранилище пикселей. Unmount presenter не вызывает потерю буфера (сейчас `resetCanvasElement` кладёт `_imageData` только если явно `setCanvas()` без аргумента; компонент null игнорирует).
4. Скрытый слот: presenter не обязателен. Активный (позже — linked) — blit буфера на DOM.
5. Mask Area — второй буфер того же контракта, свой presenter когда маска видна.
6. Resize / load / undo идут в буфер, затем present если есть монитор.

## Где смотреть

- [`PatternService.bindCanvas`](../../../src/store/patterns/_service/PatternService.ts)
- [`PatternCanvasService`](../../../src/store/patterns/_service/patternServices/PatternCanvasService.ts) — `setCanvas` / `_imageData`
- [`Pattern/index.tsx`](../../../src/components/Pattern/index.tsx) — `handleCanvasRef`, mask Area
- [`patternWorkspace.scss`](../../../src/styles/patternWorkspace.scss) — слоты

## Сломается, если ошибиться

`bindCanvas`, resize, undo/redo, load image, mask canvas, demonstration `captureStream` (должен идти с presenter видимого).

## Готово когда

- Переключение A↔B не теряет пиксели B.
- Нет привязки «живой bitmap = DOM node слота».
- Undo/load/resize работают.
- Скрытый паттерн можно прочитать через сервис (`getImageData` с буфера ещё ок).

## Не входит

Видео без readback, GPU-blur, перепись инструментов, cook graph.
