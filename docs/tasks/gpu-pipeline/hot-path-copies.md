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

`video.pushNewFrame` — этап 4a: source-паттерн `copyTex`, **0.21 ms** ([`baselines/04-after.md`](baselines/04-after.md)). Камера пока `texSubImage3D` с video.

`video.drawImage` — только platformer world. Видимый монитор: `canvas.present` **0.08 ms** ([`baselines/04-gl-present.md`](baselines/04-gl-present.md)). `video.composite` — source-over на dest, **0.05 ms**. `canvas.downloadGpu` — GL→2D на жесте / `getImageData`. `canvas.uploadGpu` — после штриха.

Внешний спан `video.getFrameData` / `video.valuesService` / `draw.valuesMasked` уже был — внутри них более узкие имена из таблиц.

Не кадр (не трогаем): `history/actions`, `import/actions` save/load, clipboard, `projectSerializer`, `room/actions`, `pattern/helpers` startImage, resize паттерна, platformer `init`/`stop`, кнопка блюра в `blur/actions`.
