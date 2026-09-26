# 01 — модуль volume view: raymarch + орбита

**Статус: закрыт** (2026-09-26).

Словарь пайплайна: [`../../gpu-pipeline/names.md`](../../gpu-pipeline/names.md). Рядом по блоку: [02](02-toggle-and-frame.md), [03](03-mouse-orbit.md).

## Сейчас

`ShaderVideoModule` копит кадры в `TEXTURE_3D` (`cubeTexture`) и каждый кадр режет из неё плоский 2D-результат своим frag. Отдельного просмотра объёма нет: сбоку / с орбиты куб не рисуется.

## Сделать

Класс `VideoVolumeView` рядом с видео-сервисом (не React):

1. **Орбита** — yaw / pitch / distance вокруг центра AABB куба; view/proj для луча.
2. **Raymarch** — луч на пиксель × AABB, шаги по `sampler3D` той же `cubeTexture`; режим один на первую версию (первый непрозрачный hit или alpha accumulation).
3. **`render(cubeTexture, width, height) → WebGLTexture`** — кадр размера паттерна, как выход `updateImage()` у 2D-видео.
4. **`handlePointer`** — можно заглушка; проводка мыши в [03](03-mouse-orbit.md).

Не дублировать `pushFrame` / заливку 3D. Из модуля в `PatternBuffer` не писать — только отдать текстуру кадра (запись в dest — в [02](02-toggle-and-frame.md)).

## Сделано

- [`VideoVolumeView`](../../../../../src/store/patterns/_service/patternServices/PatternVideoService/VideoVolumeView/index.ts): орбита, raymarch (alpha accumulation), `render(...) →` frame texture, `handlePointer` уже крутит yaw/pitch (gate — [03](03-mouse-orbit.md)).
- Семпл z с учётом `queueOffset` / stack (как в видео-frag).
- Поле `patternVideoService.volumeView` — ветка в `onFrame` в [02](02-toggle-and-frame.md).

## Готово

Из живой `cubeTexture` стабильно получается 2D-кадр с орбиты.
