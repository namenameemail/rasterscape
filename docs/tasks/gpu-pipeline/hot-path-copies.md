# Опись: копии всей картинки в процессор на кадре

Снято при этапе 0. Новые такие копии в цикле кадра не добавлять. Undo / сейв / буфер обмена сюда не входят.

## Осталось

| Спан | Где | Когда | Что копируется |
|------|-----|--------|----------------|
| `platformer.collision.getImageData` | `PlatformerEngine.step` | playing и world dirty | `world.getImageData` перед `collision.rebuild` |

## Снято на этапе 3

| Было | Стало |
|------|-------|
| `values.updateMasked` — `getImageData` + `createMaskedImageFromImageData` ~45 ms на кадре видео | `drawImage` + `source-in`, **0.10 ms**, только жест / смена маски |
| `values.updateSelected` — то же с selection mask | тот же композит с `maskCanvas` |

## Снято на этапе 2

| Было | Стало |
|------|-------|
| `video.source.getImageData` — `getImageData` канваса-источника каждый кадр | канвас источника уходит в `texSubImage3D` как есть |
| `video.source.resize` — `resizeImageData` при несовпадении размера | `video.source.scale` — `drawImage` со скейлом на GPU |
| `video.depth.getImageData` — до 4 паттернов за кадр | `video.depth.texture` — `texSubImage2D` с канвасов |
| `video.blur` — get + StackBlur + put | тот же спан, внутри `filter: blur()` канваса |
| `platformer.blur` — get + StackBlur + put мира | тот же спан, `filter: blur()` |

## Не съём в процессор, но в кадре

`video.pushNewFrame` — `texSubImage3D` с 2D-канваса, **~17–26 ms** на 1080p ([`baselines/03-after.md`](baselines/03-after.md)). Уйдёт на этапе 4, когда source станет текстурой.

`canvas.present` (этап 1) — блит буфера на видимый канвас, только у видимого. `video.drawImage` — блит GL-канваса в 2D-буфер. Оба уйдут вместе с GL-буфером.

Внешний спан `video.getFrameData` / `video.valuesService` / `draw.valuesMasked` уже был — внутри них более узкие имена из таблиц.

Не кадр (не трогаем): `history/actions`, `import/actions` save/load, clipboard, `projectSerializer`, `room/actions`, `pattern/helpers` startImage, resize паттерна, platformer `init`/`stop`, кнопка блюра в `blur/actions`.
