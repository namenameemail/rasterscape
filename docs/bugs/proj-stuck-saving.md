# Proj застревает жёлтым

**Статус:** открыт  
**Замечено:** 2026-09-09, после GPU-кадра видео (4a / маска source / FBO)

Кнопка Proj часто остаётся жёлтой. Жёлтый = `projects.isSaving`, не dirty. Красный = dirty и сейв не идёт.

## Как сейчас сохраняется паттерн

Паттерн в IndexedDB не пишется с кадра. Пишется **проект целиком** (autosave или сейв перед сменой проекта).

1. Любой redux-action не из ignore-списка → `isDirty`, debounce **1.5 s** (`projectAutosave.ts`). Ignore: `projects/`, `position/`, `hotkeys/`, … Видео-кадр **не** диспатчит, сам по себе dirty не ставит.
2. `saveCurrentProject`: `isSaving = true` (жёлтый), один `saveInFlight`.
3. **Главный поток, синхронно** `buildProjectSerializeRequest`:
   - для каждого паттерна `canvasService.getImageData()` и `maskService.getImageData()`;
   - это `PatternBuffer.readPixels` → при живом видео dest обычно `cpuInSync = false` → `ensureCpu` → blit GPU→default FB → `drawImage` в 2D → `getImageData`;
   - current в history сейва **подменяется** этим съёмом (не `history.value.current` из стора);
   - плюс копии всего undo (`before` / `after`) через `cloneImageBuffer`.
4. Воркер: каждый ImageData → **base64**, весь payload → `JSON.stringify` → `ArrayBuffer`.
5. `putProjectBuffer` в IDB.
6. Если за время сейва `dirtyGeneration` сменился — clean не ставят, retry через 3 s. Иначе `isDirty = false`.
7. `finally`: `isSaving = false`. Жёлтый снимается **только здесь**. Если промис сейва не резолвится — жёлтый навсегда.

Старт видео (`video/actions.start`) диспатчит `updateImage` + `START_UPDATING` → dirty → через 1.5 s сейв **пока видео уже крутится**.

## Гипотезы

1. **Сейв не заканчивается.** `getImageData` / GPU readback или воркер/IDB зависают. `isSaving` так и остаётся true. После смены GL (FBO, `preserveDrawingBuffer: false`) readback на dest с видео мог стать хрупким или очень долгим.
2. **Воркер молча умирает.** 1080p × (current + undo) → огромный JSON+base64. Нет `onmessage` / `onerror` → `pending` висит, жёлтый навсегда.
3. **Сейв идёт, но не успевает.** Readback + base64 на большом размере держат жёлтый десятки секунд. Если в это время снова dirty (жест, старт видео, слайдер) — `success superseded` → сразу новый сейв. Визуально «всегда жёлтый».
4. **Менее вероятно:** видео каждый кадр ставит dirty. Кадр не ходит в redux. Проверить, нет ли частых action (`pattern/video/…`, CF) пока крутится стрим.

## Как снять профиль

1. Debug overlay: набор **Save** (по умолчанию), **Rec**.
2. Дождаться жёлтого Proj (или воспроизвести: видео A←B, жест / старт видео).
3. **Stop** → **Save** → читать [`profiling/latest.json`](../../profiling/latest.json).

Имена в JSON (не `autosave.start` без префикса):

| Имя | Тип | Что |
|---|---|---|
| `projects.autosave.start` | log | сейв начался |
| `projects.autosave.marked dirty` / `still dirty` | log | что сделало dirty (+ `action`) |
| `projects.autosave.serialize` | span | весь serialize (обёртка) |
| `projects.autosave.serialize.build` | span | sync: getImageData / clone history |
| `projects.autosave.serialize.worker` | span | ожидание воркера (base64/JSON) |
| `projects.autosave.idb put` | span | запись в IndexedDB |
| `canvas.downloadGpu` | span | GPU→CPU readback (если был) |
| `projects.autosave.success` | log | ок, dirty снят |
| `projects.autosave.success superseded` | log | dirty сменился во время сейва → retry |
| `projects.autosave.failed` | log | ошибка |

Чтение:

- после `start` нет `success` / `failed` → зависли;
- длинный `serialize.build` → readback / getImageData;
- длинный `serialize.worker` → воркер / JSON;
- пила `success superseded` → не успевает, визуально «всегда жёлтый».

## Допроверить

- Жёлтый **не снимается** (висит минутами) или **мигает** / держится 5–30 s и проходит.
- Только с живым video-pattern или и без него (кисть, два 1080p, длинный undo).
- Один паттерн 400×400 без видео: жёлтый короткий? Тот же проект 1080p + A←B: длинный или вечный?
- После Stop видео: жёлтый уходит сам или только после перезагрузки.
- Пока жёлтый: жив ли `projectSerialize.worker`.

## Лог

| Дата | Что |
|---|---|
| 2026-09-09 | Заведён. Сейв = sync readback буфера + воркер base64/JSON + IDB. Жёлтый = `isSaving`. |
| 2026-09-09 | Набор профиля Save: Rec пишет `projects.*` без `rs:profile`. Спаны `serialize.build` / `serialize.worker`. Канвасные точки на месте (набор Frame). |
| 2026-09-09 | Профиль ~19 s: Stop → debounce fired → `waiting for in-flight save` → **тишина** (нет start/serialize/success). Жёлтый = вечный await зависшего сейва (начат до Rec, dirtyGen 156+). |
| 2026-09-09 | Фикс: таймаут воркера 45 s + abandon in-flight (terminate worker, снять isSaving, epoch). |

### Профиль 2026-09-09 (~30 s Rec, Save)

| Спан | count | avg | max |
|---|---:|---:|---:|
| `projects.autosave.serialize` | 2+ | **~20 s** | 20.8 s |
| `…serialize.worker` | 2+ | **~19 s** | 20.3 s |
| `…serialize.build` | 5 | ~0.55 s | 0.58 s |
| `projects.autosave.idb put` | 1 | ~1.0 s | 1.0 s |
| `canvas.downloadGpu` | 202 | ~1.0 ms | 3.8 ms |

Жизненный цикл: 5× `start`, 4× `waiting for in-flight`, 1× `success superseded` (dirtyGen 126→316), `retry` → снова `start`. Сессия оборвалась при `isSaving: true`, финального `success` нет.

Dirty: **294× `change`**, плюс `pattern/update-image`, video start/stop, `changing/*`. Пока крутится CF/`change`, debounce не даёт сейву «догнать» dirtyGeneration: воркер ~20 s ≫ пауза без правок.

Вывод: жёлтый из‑за **долгого worker (base64/JSON)** + **постоянного dirty от `change`**, не из‑за GPU readback (build ~0.5 s, downloadGpu ~1 ms).

### Правка 2026-09-09

В [`projectAutosave.ts`](../../src/storage/projectAutosave.ts):

1. Игнор `change` и `changing/start` (покадровый CF) — не крутят dirtyGeneration.
2. Пока у любого паттерна `video.updatingOn` — autosave не планируется; на `START_UPDATING` сброс debounce.
3. На `STOP_UPDATING` (и любые правки без живого видео) — обычный debounce 1.5 s.

Проверить: Start video + CF/change → Proj не жёлтый всё время стрима; Stop → один сейв (жёлтый на время encode, потом гаснет).

## Пока не закрывать

Правка есть; нужен повторный прогон с набором Save. Worker ~20 s на больших проектах остаётся отдельной темой (не этот баг).
