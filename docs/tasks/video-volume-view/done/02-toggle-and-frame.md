# 02 — toggle: плоское видео или объём в паттерн

**Статус: закрыт** (2026-09-26).

Словарь: [`../../gpu-pipeline/names.md`](../../gpu-pipeline/names.md). Модуль кадра: [01](01-volume-module.md).

## Сейчас

На каждом кадре видео всегда один путь: 2D-срез (`updateImage`) → `compositeVideo` в dest → present. Режима «вместо этого объём» нет.

## Сделать

**Не два рендера подряд**, а **один из двух** на кадр (toggle):

| `volumeViewOn` | Что кладётся в dest |
|----------------|---------------------|
| выкл | как сейчас: плоский кадр `updateImage()` |
| вкл | объём: `VideoVolumeView.render(...)` |

Общее после выбора кадра: `compositeVideo` → blur (если есть) → `presentGl` → values. Dest затирается и в том и в другом случае — просто **источник картинки** разный.

1. `VideoParams.volumeViewOn` + action + toggle в `VideoControls`.
2. Ветка в `onFrame` только на шаге «какой кадр получить»; накопление в `cubeTexture` (`pushFrame`) — общее, до развилки.
3. Платформер в первой версии не смешивать.

Зафиксировать: volume view сам поднимает cook/video или только при уже идущем видео.

## Сделано

- `volumeViewOn` в params / `setVideoVolumeView` / кнопка «объём» рядом с always.
- `onFrame`: `pushSourceFrame` общий → XOR `updateImage` | `volumeView.render` → тот же composite/blur/present.
- Платформер: при `playing` volume не берём (остаётся 2D-путь).
- **Cook:** toggle сам видео/cook не стартует — только режим кадра при уже идущем `update`.

## Готово

Toggle переключает: в паттерн идёт либо обычное 2D-видео, либо volume-кадр — не оба за один `onFrame`.
