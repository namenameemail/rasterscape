# Платформер: копии / CPU на кадре

Вынесено из [`../gpu-pipeline/hot-path-copies.md`](../gpu-pipeline/hot-path-copies.md). В основном пайплайне паттерна полных `getImageData` на кадре больше нет — хвост здесь.

## Полный съём в процессор

| Спан | Где | Когда | Что | Задача |
|------|-----|--------|-----|--------|
| `platformer.collision.getImageData` | `PlatformerEngine.step` | playing и world dirty | `world.getImageData` перед `collision.rebuild` | [04](04-collision.md) |

## Ещё тяжело на кадре (не обязательно getImageData)

| Что | Суть | Задача |
|-----|------|--------|
| `video.drawImage` | кадр видео → 2D world | [01](01-video-to-world.md) |
| `platformer.blur` | CPU `filter: blur` мира | [02](02-blur.md) |
| `presentFromCpu` / tools → world | сборка кадра и кисть в world 2D | [03](03-display.md) |

Undo / сейв / clipboard / init·stop platformer — не кадр, не трогаем в этих задачах.
