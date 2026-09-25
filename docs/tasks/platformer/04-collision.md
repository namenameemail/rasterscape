# 04 — платформер: коллизии

Было 4c.15. Оглавление: [`README.md`](README.md).

## Сейчас

Единственный полный `getImageData` в hot-path описи — `platformer.collision.getImageData`, когда world dirty ([`../gpu-pipeline/hot-path-copies.md`](../gpu-pipeline/hot-path-copies.md)).

## Сделать

Оставить редкий съём, но удешевить (меньше разрешения, dirty точнее, GPU→CPU только для collision map). Не каждый кадр отрисовки — уже так; ужать cost когда dirty.

## Где

- `PlatformerEngine` / collision rebuild

## Готово когда

Профиль: collision съём реже или дешевле; геймплей коллизий тот же.

## Ок оставить на CPU

Сам факт «иногда снять пиксели для hit-test» — нормальная редкая операция; цель — не раздувать её.
