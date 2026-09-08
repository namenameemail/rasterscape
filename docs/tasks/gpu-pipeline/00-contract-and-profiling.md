# Этап 0 — контракт и профилирование

Зафиксировать, где живут пиксели и какие readback законны. Замерить текущий кадр. Без этого следующие этапы нельзя сравнивать.

Не переносить буфер с DOM в этом этапе.

## Что такое PatternBuffer

Сейчас «картинка паттерна» — это DOM-канвас плюс `PatternCanvasService`: кто хочет пиксели, берёт этот канвас или делает `getImageData()`.

**`PatternBuffer` в коде ещё нет.** Это имя будущей сущности: «лист бумаги» паттерна отдельно от того, что на экране. Как TOP в TouchDesigner: пиксели живут в буфере, монитор только показывает копию.

Зачем на этапе 0 «описать API»: не писать класс целиком, а **договориться о методах**, чтобы этапы 1–5 не разъехались. Достаточно TypeScript-интерфейса или черновика в этом файле. Реализация — с этапа 1.

Смысл контракта:

| Метод / поле | Зачем |
|---|---|
| `width` / `height` | Размер листа |
| текстура цвета и маски | Где реально лежат пиксели (GPU), не DOM-узел |
| `dirty` | Буфер изменился, монитор надо обновить |
| CPU-кэш после readback | Чтобы undo/сейв не читали GPU дважды подряд |
| `readPixels(): ImageData` | Редкий дорогой съём в CPU (история, PNG, коллизии) |
| `present(canvas)` | Скинуть буфер на видимый DOM-канвас («включить монитор») |

Позже `PatternCanvasService.getImageData()` останется для старого кода, но внутри будет звать `readPixels()`, а не считать канвас на экране источником истины.

## Сделать

1. Записать интерфейс `PatternBuffer` (поля/методы из таблицы выше). Реализацию не делать.
2. Белый список вызовов `getImageData` / `putImageData` / `createMaskedImageFromImageData` в hot path. Остальные — кандидаты на вынос с кадра.
3. Базовый замер через `profileLogger` на сценарии: видео A, source = паттерн B (скрыт), по возможности 1080p.
   - спаны уже есть: `video.getFrameData`, `video.pushNewFrame`, `video.shaderDraw`, `video.drawImage`, `video.blur`, `draw.valuesMasked`
   - зафиксировать в этом файле или в `profiling/` комментарий «до»: avg/max по спанам, `frame.interval`
4. Правило для кода: новый код в кадре не добавляет `getImageData`, кроме белого списка.

## Где смотреть

- [`src/store/patterns/_service/patternServices/PatternCanvasService.ts`](../../../src/store/patterns/_service/patternServices/PatternCanvasService.ts)
- [`src/store/patterns/_service/patternServices/PatternValuesService.ts`](../../../src/store/patterns/_service/patternServices/PatternValuesService.ts)
- [`src/store/patterns/_service/patternServices/PatternVideoService/index.ts`](../../../src/store/patterns/_service/patternServices/PatternVideoService/index.ts)
- [`src/utils/profiling/ProfileLogger.ts`](../../../src/utils/profiling/ProfileLogger.ts)
- [`.cursor/rules/profiling.mdc`](../../../.cursor/rules/profiling.mdc)

## Готово когда

- Интерфейс `PatternBuffer` записан (TS или черновик в docs). Класса с GPU ещё нет.
- Список readback на кадр известен (видео source, DEPTH, blur, valuesMasked, collision).
- Есть эталонный профиль «до» для сценария A←B.

## Не входит

Перенос пикселей с DOM-канваса, смена видео-пути, перепись кистей.
