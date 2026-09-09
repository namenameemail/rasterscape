# 4c.13 — платформер: blur мира

Сейчас: `applyBlurToWorld` — CPU `filter: blur` по миру, пока радиус > 0, на кадре.

## Сделать

Blur мира шейдером (как blur видео) или не каждый кадр, если картинка не менялась.

## Где

- platformer blur path / `blurCanvasInPlace`

## Готово когда

При blur > 0 нет тяжёлого CPU blur на каждый frame без нужды.
