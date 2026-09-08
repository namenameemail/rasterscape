# Этап 0 — договориться и замерить кадр

Понять, где сейчас лежат пиксели и **где каждый кадр копируют всю картинку в процессор**. Замерить, сколько это стоит. Без замера «до» не сравнить этапы 1–5.

Пиксели с DOM-канваса в этом этапе **не переносим**. Класс буфера **не пишем**.

## Что такое PatternBuffer

Сейчас картинка паттерна = канвас на экране + `PatternCanvasService`. Кто хочет пиксели, берёт этот канвас или делает `getImageData()`.

**`PatternBuffer` в коде ещё нет.** Это имя будущей штуки: «лист бумаги» отдельно от монитора. Как TOP в TouchDesigner: пиксели живут в буфере, экран только показывает копию.

На этапе 0 «описать API» = **записать методы на бумаге** (интерфейс TypeScript или таблица ниже), чтобы этапы 1–5 не разъехались. Рабочий класс — с этапа 1.

| Метод / поле | Зачем простыми словами |
|---|---|
| `width` / `height` | Размер листа |
| текстура цвета и маски | Где лежат пиксели (видеопамять), не узел на странице |
| `dirty` | Лист изменился, монитор надо обновить |
| копия в процессоре после съёма | Undo/сейв не снимают GPU дважды подряд |
| `readPixels(): ImageData` | Редко снять всю картинку в процессор (история, PNG, коллизии) |
| `present(canvas)` | Показать буфер на видимом канвасе («включить монитор») |

Позже `PatternCanvasService.getImageData()` можно оставить для старого кода: внутри он будет звать `readPixels()`, а не считать канвас на экране «настоящей» картинкой.

## Копии в процессор каждый кадр

`getImageData` / `putImageData` / `createMaskedImageFromImageData` — не «просто посмотреть картинку». Это **скопировать все пиксели** между канвасом/GPU и процессором. На большом размере это тяжело, если делать 60 раз в секунду.

**Кадр** (то, что крутится постоянно): видео, рисование с зажатой мышью, платформер. Не undo и не «сохранить файл».

Задача этапа 0: **перечислить все такие копии, которые сейчас сидят в кадре**. Это опись «что мерить и что на этапах 2–3 заменить», не разрешение копировать навсегда.

Ориентир, что туда попадёт:

- видео берёт другой паттерн как source — `getImageData` каждый кадр
- DEPTH-функция — то же с нескольких паттернов
- блюр видео — снять картинку, StackBlur, записать обратно
- `updateMasked` — собрать картинку с маской (даже если не каждый кадр, а раз в ~100 ms)
- коллизии платформера, если мир пересобирают из пикселей на кадре

`getImageData` при undo, сейве, буфере обмена **в эту опись не входит**: они редкие, их как раз можно оставить на процессоре.

Правило после описи: **новый код не добавляет такие копии в кадр.** Если нашли вызов в цикле кадра, которого нет в описи — его нельзя оставлять на кадре.

На этапах 2–3 каждую строку описи **убираем с кадра**: не удаляем функции из языка, а перестаём копировать всю картинку 60 раз в секунду (например source-паттерн читаем как текстуру на GPU). Undo по-прежнему может снять картинку один раз.

## Сделать

1. Записать интерфейс `PatternBuffer` (таблица выше). Реализацию не делать.
2. Опись копий на кадре: [`hot-path-copies.md`](../hot-path-copies.md).
3. Снять замер «до» и **положить его в git**, не в `profiling/latest.json` (этот файл в `.gitignore`, после перезаписи его не с чем сравнивать).

### Как снимать

`profileLogger.time` в видео **сам на диск не пишет**. Нужен Save в debug overlay.

1. Dev server, Rec в overlay (и при необходимости `localStorage.setItem('rs:profile', '1')`).
2. Сценарий: два паттерна. На A включено видео, source = паттерн B. Размер обоих по возможности 1080p (или записать фактический width×height). Переключить активный на A, чтобы B был скрыт. **Без** DEPTH cut function и **без** blur (радиус 0), чтобы замер не смешивал три разных копии. 5–10 секунд живого видео.
3. Stop, затем **Save**. Не просить пользователя копировать консоль: читать [`profiling/latest.json`](../../../../profiling/latest.json) в репозитории.
4. Из `summary` взять спаны и `frame.interval` (это `values`, не span).

Метки, которые должны быть в `summary.spans` при живом видео A←B:

| Имя в JSON | Что это |
|---|---|
| `video.getFrameData` | весь съём кадра source (внутри `video.source.getImageData`) |
| `video.source.getImageData` | `getImageData` канваса B |
| `video.pushNewFrame` | заливка в шейдер |
| `video.shaderDraw` | сам шейдер |
| `video.drawImage` | копия GL → канвас A |
| `video.valuesService` | masked на кадре видео |

`video.blur` в этом замере не ждать (blur выключен). `draw.valuesMasked` — если в сессии не рисовали, может не быть.

### Куда писать (это эталон для этапов 2–3)

| Файл | Содержимое |
|---|---|
| [`baselines/00-before.md`](../baselines/00-before.md) | дата, размеры A/B, таблица count / avgMs / maxMs по спанам выше + `frame.interval` (avg/max) |
| [`baselines/00-before.session.json`](../baselines/00-before.session.json) | summary сессии (полный `latest.json` слишком большой из-за entries) |

Позже: тот же сценарий после этапа 2 → `baselines/02-after.md` + `02-after.session.json`. Сравнивать **те же имена спанов**: у `video.getFrameData` avg должен упасть или спан пропасть, если съёма всей картинки B больше нет. Не сравнивать сырой FPS с другой машиной как единственный критерий.

4. В новом коде кадра не добавлять `getImageData` и соседние копии, если этого нет в описи.

## Где смотреть

- [`src/store/patterns/_service/patternServices/PatternCanvasService.ts`](../../../../src/store/patterns/_service/patternServices/PatternCanvasService.ts)
- [`src/store/patterns/_service/patternServices/PatternValuesService.ts`](../../../../src/store/patterns/_service/patternServices/PatternValuesService.ts)
- [`src/store/patterns/_service/patternServices/PatternVideoService/index.ts`](../../../../src/store/patterns/_service/patternServices/PatternVideoService/index.ts)
- [`src/utils/profiling/ProfileLogger.ts`](../../../../src/utils/profiling/ProfileLogger.ts)
- [`.cursor/rules/profiling.mdc`](../../../../.cursor/rules/profiling.mdc)

## Готово когда

- Методы `PatternBuffer` в [`PatternBuffer.ts`](../../../../src/store/patterns/_service/patternServices/PatternBuffer.ts). Класса с GPU ещё нет.
- Опись: [`hot-path-copies.md`](../hot-path-copies.md).
- Есть эталон в `docs/tasks/gpu-pipeline/baselines/` (не только `profiling/latest.json`).

## Не входит

Перенос пикселей с DOM-канваса, смена видео, перепись кистей.

---

## Закрыто

Дата: 2026-09-08. Ветка `gpu-pipeline`.

Сделано:

- Интерфейс без GPU-класса: [`PatternBuffer.ts`](../../../../src/store/patterns/_service/patternServices/PatternBuffer.ts)
- Опись копий на кадре: [`hot-path-copies.md`](../hot-path-copies.md)
- Спаны: `video.source.getImageData`, `video.source.resize`, `video.depth.getImageData`, `values.updateMasked`, `values.updateSelected`, `platformer.collision.getImageData`, `platformer.blur` (плюс уже бывшие `video.getFrameData` / `video.drawImage` / …)
- Эталоны только `summary` (сырой `latest.json` с тысячами events в git не клали):
  - [`00-before.md`](../baselines/00-before.md) — размер в логе нет, ~60 FPS, `video.source.getImageData` **1.10 ms**
  - [`00-before-1080.md`](../baselines/00-before-1080.md) — **1920×1080**, видео + кисть с маской: `getImageData` **15.4 ms**, `values.updateMasked` **32.7 ms**, кадр **32.5 ms** (~30 FPS), пик 1330 ms

Для сравнения после этапа 2 брать **1080p**: там FPS уже падает, `getImageData` ≈ весь `getFrameData`, шейдер ~0.02 ms.

Следующая задача: [`01-buffer-off-css.md`](../01-buffer-off-css.md).
