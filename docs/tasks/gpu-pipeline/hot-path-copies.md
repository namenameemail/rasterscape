# Опись: копии всей картинки в процессор на кадре

Снято при этапе 0. Новые такие копии в цикле кадра не добавлять. Undo / сейв / буфер обмена сюда не входят.

| Спан | Где | Когда | Что копируется |
|------|-----|--------|----------------|
| `video.source.getImageData` | `PatternVideoService.getFrameData` | каждый кадр видео, source = паттерн | `getImageData` канваса B |
| `video.source.resize` | там же | source размер ≠ видео | `resizeImageData` (ещё get/put) |
| `video.blur` | `PatternVideoService.onFrame` | видео и blur radius > 0 | get + StackBlur + put |
| `video.depth.getImageData` | `ShaderVideoModule` DEPTH | видео и cut function DEPTH | `getImageData` до 4 паттернов за кадр |
| `values.updateMasked` | `PatternValuesService.updateMasked` | маска вкл. и throttle (~100 ms): видео `updateForVideoFrame`, рисование `draw.valuesMasked` | canvas+mask `getImageData` + `createMaskedImageFromImageData` |
| `values.updateSelected` | `PatternValuesService.updateSelected` | есть selection mask, тот же throttle | canvas + selection mask |
| `platformer.collision.getImageData` | `PlatformerEngine.step` | playing и world dirty | `world.getImageData` перед `collision.rebuild` |
| `platformer.blur` | `applyBlurToWorld` | видео+платформер и blur | get + StackBlur + put мира |

Внешний спан `video.getFrameData` / `video.valuesService` / `draw.valuesMasked` уже был — внутри них теперь более узкие имена из таблицы.

С этапа 1 в кадре есть ещё `canvas.present` — блит буфера на видимый канвас. Это не съём в процессор и он только у видимого паттерна; на этапах 2–3 станет копией на GPU.

Не кадр (не трогаем): `history/actions`, `import/actions` save/load, clipboard, `projectSerializer`, `room/actions`, `pattern/helpers` startImage, resize паттерна, platformer `init`/`stop`.
