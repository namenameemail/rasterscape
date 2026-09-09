# 4c.06 — кисть | выдел-е: источник штампа

Словарь: [`../names.md`](../names.md).  
В UI тип кисти тоже называется «выдел-е» — это `EBrushType.Select` (штамп пикселей из области), не обрезка любого штриха — то [01](01-selection-clip.md).

**Сейчас:** предпочитает upload CPU `.selected`, не только `ensureSelectedGpu`.

## Сделать

Штамп с GPU selected (или один upload при смене выделения, не на каждый кусок жеста зря).

## Где

- `brushSelect.tsx`
- `PatternValuesService.ensureSelectedGpu` / `.selected`

## Готово когда

Кисть | выдел-е при GPU-dest без лишнего CPU snapshot на каждый draw tick.
