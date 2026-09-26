# 03 — мышь крутит камеру, не рисует

**Статус: закрыт** (2026-09-26).

## Сейчас

Monitor → `CanvasEventsService` → инструменты (кисть/линия).

## Сделать

При `volumeViewOn` на этом паттерне:

- не звать tool `onDown` / `onDraw` / `onClick` / `onRelease` (рисование);
- pointer → `VideoVolumeView.handlePointer` (орбита).

Gate в одном месте (`PatternToolService` или вход handlers), без второго обхода всего CES. Курсор grab — по желанию.

Зависит от [01](01-volume-module.md) и [02](02-toggle-and-frame.md).

## Сделано

- Gate в `PatternToolService.canvasEventHandlers`: при `volumeViewOn` tool/present не вызываются; `onDown`/`onDraw`/`onRelease` → `videoService.volumeView.handlePointer`.
- Маска и CES не трогали. Курсор не меняли.

## Готово

С включённым volume view жест на канвасе крутит объём; штрих не ставится. Выключили — снова рисование как обычно.
