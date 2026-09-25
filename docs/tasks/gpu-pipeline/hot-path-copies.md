# Опись: копии всей картинки в процессор на кадре

Снято при этапе 0. Новые такие копии в цикле кадра **основного** пайплайна паттерна не добавлять. Undo / сейв / буфер обмена сюда не входят.

## Статус

**Готово** для happy-path паттерна (видео, values, штампы, present): полных `getImageData` на кадре больше нет.

**Хвост — только платформер** → [`../platformer/hot-path-copies.md`](../platformer/hot-path-copies.md) (`platformer.collision.getImageData` + связанные CPU-пути world).

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
| `platformer.blur` — get + StackBlur + put мира | ушло в платформер: тот же спан, `filter: blur()` — см. [02](../platformer/02-blur.md) |

## Не съём в процессор, но в кадре (паттерн)

`video.pushNewFrame` — этап 4a: source-паттерн `copyTex`, **0.21 ms** ([`baselines/04-after.md`](baselines/04-after.md)). Камера пока `texSubImage3D` с video.

Видимый монитор: `canvas.present` ~0.2 ms ([`done/04c-11-present.md`](done/04c-11-present.md); раньше [`baselines/04-gl-present.md`](baselines/04-gl-present.md)). `video.composite` — source-over на dest. `canvas.downloadGpu` — по делу (жест / `getImageData`), не happy-path dest после 4b. `canvas.uploadGpu` — после штриха / первого GPU-кадра.

Платформерные `video.drawImage` / world / collision — [`../platformer/`](../platformer/README.md).

Не кадр (не трогаем): `history/actions`, `import/actions` save/load, clipboard, `projectSerializer`, `room/actions`, `pattern/helpers` startImage, resize паттерна, кнопка блюра в `blur/actions`.
