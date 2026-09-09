# 4c.15 — платформер: коллизии

Сейчас: единственный полный `getImageData` в hot-path описи — `platformer.collision.getImageData`, когда world dirty ([`../hot-path-copies.md`](../hot-path-copies.md)).

## Сделать

Оставить редкий съём, но удешевить (меньше разрешения, dirty точнее, GPU→CPU только для collision map). Не каждый кадр отрисовки — уже так; ужать cost когда dirty.

## Где

- `PlatformerEngine` / collision rebuild

## Готово когда

Профиль: collision съём реже или дешевле; геймплей коллизий тот же.

## Ок оставить на CPU

Сам факт «иногда снять пиксели для hit-test» — нормальная редкая операция; цель — не раздувать её.
