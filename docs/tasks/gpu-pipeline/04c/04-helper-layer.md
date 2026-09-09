# 4c.04 — helper-слой перед GPU

Сейчас: Shape / Solid / SolidPattern собирают полный штрих на helper-канвасе размера dest, потом `compositeLayerGpu` (upload всего слоя).

## Сделать

Где дёшево — геометрия или маленькая stamp-текстура напрямую в dest, без helper на весь кадр. Или оставить helper, но не раздувать cost (профилем решить).

## Где

- `brushForm.tsx`, `lineSolid.tsx`, `lineSolidPattern.tsx`
- `PatternBuffer.compositeLayerGpu`

## Готово когда

Профиль: меньше/дешевле `compositeLayerGpu` / upload слоя при том же виде штриха.
