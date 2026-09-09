# 4c.08 — values: masked / selected на CPU

Сейчас: `updateMasked` / `updateSelected` — 2D `source-in`. `syncMaskedReference` делает `ensureCpu`. GPU-хелперы (`ensureMaskedGpu` / `ensureSelectedGpu`) есть, но CPU-путь ещё жив. При GPU-ahead masked на CPU может отставать до release `update()`.

## Сделать

Потребители читают GPU-masked/selected где можно; sync без лишнего download; починить отставание при GPU-ahead.

## Где

- `PatternValuesService.ts`
- `utils/canvas/helpers/composite.ts`

## Готово когда

Нет сюрпризов «masked устарел после GPU-жеста»; download только когда CPU-потребителю реально нужны пиксели.

## Не входит

Clipboard / старый `createMaskedImageFromImageData` — можно оставить на CPU.
