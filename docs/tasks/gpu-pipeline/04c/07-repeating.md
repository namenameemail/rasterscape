# 4c.07 — Repeating

Сейчас: набор координат тот же (`repeating/helpers`); при 2D-пути сетка рисуется в 2D. Отдельного GPU-backend для repeating нет (в 4b координаты не трогали).

## Сделать

Тот же список точек → GPU stamp/layer (когда dest на GPU). CSS/мышь repeating не ломать.

## Где

- `repeating/helpers.ts`
- `ToolsServices/*` + `position.coordinates`

## Готово когда

Repeating-сетка при GPU-жесте без отката всего dest в CPU только из-за repeating.
