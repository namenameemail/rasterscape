# 4c.05 — Line «back»: заливка с CPU masked

Сейчас: dest уже можно композитить на GPU, но `createPattern` берёт `.masked` с CPU (`updateMaskedIfNeeded` → часто `ensureCpu` у **source**).

## Сделать

Заливка штриха с GPU-текстуры source (или эквивалент без полного CPU masked на каждый кадр жеста).

## Где

- `lineSolidPattern.tsx`
- `PatternValuesService.ensureMaskedGpu` / `.masked`

## Готово когда

Line back ± центр + видео: нет регулярного download **source** ради `createPattern`; вид как сейчас.

## Рядом

Общий CPU masked — [08](08-values-masked.md).
