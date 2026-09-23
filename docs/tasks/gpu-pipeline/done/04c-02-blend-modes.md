# 4c.02 — режимы наложения (единый GPU blend)

**Статус: закрыт** (2026-09-22). Перенесено из `04c/` → `done/`.

Словарь: [`../names.md`](../names.md). UI: «режим наложения» / `compositeOperation` (`ECompositeOperation` в [`store/compositeOperations`](../../../../src/store/compositeOperations/index.ts)).

## Цель

Один **единообразный** механизм: все режимы из `ECompositeOperation` работают на GPU-пути штампа/слоя **так же**, как сейчас `source-over`, без `ensureCpu` на жесте и без сюрпризов при видео (dest остаётся GPU-ahead).

Не «портим три режима через `gl.blendFunc`», не «остальное навсегда 2D». Полный шейдерный blend, один API для stamp и layer.

## Сделано (2026-09-22)

Один шейдерный blend (`src/gl/shaders.ts` `compositeBlend`, straight source × premul dest) для stamp и layer. `gl.BLEND` на этих путях выключен. Режим прокинут из tools; gate `=== SourceOver` снят. 2D остаётся, если нет `PatternBuffer` / чужой canvas.

Формулы сверены с Canvas2D (`src/gl/blendMath.test.ts`). Пиксель GPU: source-over, multiply, screen, destination-out. Ручная проверка режимов — ок.

## Сейчас

| Путь | Поведение |
|------|-----------|
| `compositeOperation === SourceOver` | GPU: `stampGpu` / `compositeLayerGpu` |
| иначе | 2D: `ensureCpu` + `context.globalCompositeOperation = …` |

GL сейчас всегда:

```text
blendFuncSeparate(SRC_ALPHA, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA)
```

в [`stamp.ts`](../../../../src/gl/stamp.ts) / [`composite.ts`](../../../../src/gl/composite.ts). Это только **normal**. Multiply / eraser / soft-light и т.д. через аппаратный blend **не выразить** (нужны dest + src + формула).

Gate в tools: `useGpu = compositeOperation === SourceOver && …` (`ToolsServices/*`).

## Почему шейдер, а не `gl.blend*`

Canvas2D / CSS compositing:

1. Читает **backdrop** (dest) и **source**.
2. Считает цвет по режиму (Porter–Duff или CSS blend).
3. Пишет результат с учётом alpha / opacity.

Для multiply, screen, overlay, soft-light, hue, … нужен **sample dest**. Писать в ту же текстуру, из которой читаешь — нельзя → dest читаем из копии (scratch), пишем в dest (как уже для self-stamp).

`gl.BLEND` оставляем **выключенным** на blend-pass (или только для редких оптимизаций, не как основной механизм).

## Целевая архитектура

### Один модуль blend

Новый кусок (имя ориентир): `src/gl/blend.ts` + фрагмент в `shaders.ts`.

- Вход: `src` (премультиплиированный или straight — **зафиксировать один контракт**, см. ниже), `dest`, `mode`, `opacity`, опционально `clipMask`.
- Выход: запись в FBO dest.
- Uniform `u_mode: int` (или `uint`) — маппинг 1:1 с `ECompositeOperation` (таблица в TS + те же id в GLSL `#define` / `const int`).
- Одна функция `blend(src, dst, mode) -> vec4` в GLSL; все режимы из enum, которые есть в UI.

Маппинг режимов держать рядом с enum (`compositeOperations` или `gl/blendModes.ts`), чтобы UI / Redux / шейдер не разъехались.

### Два call-site (обязательно оба)

1. **Stamp** (`stampTextures`) — сейчас source-over через `gl.BLEND` + stamp FS только множит alpha.  
   После: stamp FS (или отдельный pass) считает blend с dest; для каждого штампа / батча — sample dest из scratch-копии.
2. **Layer** (`compositeCanvasOver` → `compositeTextureOver`) — Shape / Solid / SolidPattern.  
   После: тот же blend-модуль (fullscreen quad src=layer, dest=pattern), не отдельная « entка» для source-over.

Clip selection ([`04c-01-selection-clip.md`](04c-01-selection-clip.md)): mask по-прежнему режет **source alpha** (или результат до записи); blend не подменяет clip.

### Контракт цвета / alpha (зафиксировать в коде и проверить)

Canvas2D `globalCompositeOperation` работает в **прямых** (straight) RGBA с учётом `globalAlpha`. Сейчас stamp FS отдаёт `vec4(c.rgb, c.a * opacity * mask)` и надеется на premul-blend GPU.

Для шейдерного blend:

1. Явно: **straight** или **premul** внутри формулы (один вариант на всё).
2. `opacity` — как `globalAlpha` сейчас (множитель alpha source до blend, не «поверх»).
3. Режимы вроде `destination-out` / `xor` — по спеке [Compositing and Blending Level 2](https://www.w3.org/TR/compositing-1/) / поведение Chrome Canvas2D; эталон — визуальное сравнение с текущим 2D-путём на одних пикселях.

Без зафиксированного контракта режимы «почти как Canvas» будут плыть.

### Scratch / self-read

Уже есть паттерн в `stampTextures` (self-stamp, `destFlipY`). Обобщить:

1. Перед blend-pass: dest → scratch (копия), если ещё не скопирован в этом кадре/жесте.
2. Sample backdrop из scratch, write в dest.
3. Не плодить лишние `copyTex` на каждый маленький stamp, если можно одну копию dest на батч stamps (как сейчас один FBO bind на все stamps).

`compositeLayerGpu`: та же схема (scratch backdrop → blend layer).

## Переход (как делать, по шагам)

Порядок жёсткий: сначала механизм, потом подключение tools. Не включать GPU для multiply, пока source-over на новом пути не совпал со старым.

### Шаг A — инфраструктура blend (без смены tools)

1. Таблица `ECompositeOperation → int` + GLSL branch/table.
2. `blendProgram` (fullscreen): `u_src`, `u_dst`, `u_mode`, `u_opacity`, flipY.
3. API на `GlContext`: например `blendTextureOver(dest, src, mode, opacity, …)`.
4. Перевести **только** текущий source-over layer-path (`compositeTextureOver`) на этот API с `mode = SourceOver`, `gl.BLEND` off.  
   Критерий: визуально и профилем неотличимо от сегодняшнего layer composite (Shape/Solid).
5. То же для stamp: stamp выдаёт source цвет+alpha; blend с dest через тот же модуль (не `gl.BLEND`).  
   Критерий: pattern/trailing source-over = как сейчас.

Baseline до/после A: Frame Rec, source-over, без смены режима — `stampGpu`/`compositeLayerGpu` на месте, нет регрессии `downloadGpu`.

### Шаг B — все режимы в шейдере

1. Дописать формулы для **всех** значений `ECompositeOperation` из enum (включая закомментированные в enum — **не** тащить, только то, что реально в UI/`compositeOperationSelectItems`).
2. На каждый режим: микро-проверка vs 2D (маленький canvas / fixture): один stamp поверх известного dest, сравнить RGBA (tolerance из‑за округления).
3. Сложные (hue / saturation / color / luminosity) — по CSS compositing; если численно тяжело, всё равно один код-путь, не fallback на CPU.

### Шаг C — tools: убрать gate SourceOver

Во всех `ToolsServices/*`:

```ts
// было
useGpu = compositeOperation === SourceOver && !!dest && …

// стало
useGpu = !!dest && brushEvent.canvas === dest.canvas && (!selectionMask || !!clipMask)
```

Прокинуть `compositeOperation` в `stampGpu` / `compositeLayerGpu` → `GlContext`.

2D-ветка остаётся как fallback, если нет `dest` / не тот canvas (platformer world и т.п.) — **не** из‑за режима.

### Шаг D — док + baseline

1. Обновить этот файл: «Сделано» / проверка.
2. Baseline after: жест с `multiply` (или eraser) + video A←B — есть `stampGpu`/`compositeLayerGpu`, нет регулярного `downloadGpu` на dest, штрих визуально как 2D.
3. Строка в [`../04c/README.md`](../04c/README.md): 02 закрыт; файл в `done/`.

## API (ориентир сигнатур)

```ts
// PatternBuffer
stampGpu(source, sourceFlipY, stamps, opacity, clipMask?, compositeOperation?)
compositeLayerGpu(layer, opacity, clipMask?, compositeOperation?)

// GlContext
stampTextures(..., opacity, clipMask?, mode?)
compositeCanvasOver(..., opacity, clipMask?, mode?)
blendTextureOver(dest, src, width, height, destFlipY, srcFlipY, mode, opacity)
```

Default `mode = SourceOver`, чтобы старые вызовы не ломались на шаге A.

## Не делать

- Отдельный `gl.blendFunc` на «простые» режимы и шейдер на «сложные» — два механизма, разные баги.
- Молчаливый fallback: GPU dest + вдруг 2D upload середины жеста при смене режима.
- Менять семантику UI enum / прятать режимы.
- Тащить platformer world / repeating ([07](../04c/07-repeating.md)) в этот тикет — только pattern `PatternBuffer` draw tools, как 4b.

## Где код

| Зона | Файлы |
|------|--------|
| Шейдер / GL | `src/gl/shaders.ts`, новый `blend.ts`, `GlContext.ts`, `stamp.ts`, `composite.ts` |
| Буфер | `PatternBuffer.stampGpu` / `compositeLayerGpu` |
| Tools | `CanvasEventsService/ToolsServices/*` |
| Enum / UI id | `store/compositeOperations` |

## Готово когда

1. Любой режим из селекта «режим наложения» на кисти/линии идёт по GPU-пути при тех же условиях, что source-over сейчас (dest = `PatternBuffer`, не world).
2. Один blend-модуль обслуживает stamp и layer.
3. При видео A←B + non–source-over жесте: нет регулярного `canvas.downloadGpu` dest; есть `stampGpu` или `compositeLayerGpu`.
4. Визуально сопоставимо с прежним 2D (ручная проверка основных: normal, multiply, screen, destination-out/eraser, overlay + один Hue-группы).
5. Gate `=== SourceOver` удалён из tools.

## Риски

| Риск | Как снизить |
|------|-------------|
| Расхождение с Canvas2D | Fixtures + сверка до отключения 2D-gate |
| Лишние copyTex на stamp | Одна копия dest на батч |
| Premul vs straight | Контракт на шаге A, не менять между режимами |
| Большой FS / ветвления | Один FS, `u_mode`; при необходимости later optimize, не дробить API |
