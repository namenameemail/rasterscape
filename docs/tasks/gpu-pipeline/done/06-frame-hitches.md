# 6 — диагностика зависаний кадра (hitch)

**Статус: закрыт** (2026-09-22). Перенесено из `gpu-pipeline/` → `done/`.

Не путать с «дорогим кадром»: hitch = **дыра между** `requestAnimationFrame`, когда `draw.*` / `canvas.*` дешёвые, а `frame.interval` ≫ бюджет кадра.

Симптом после 4c.01: avg ~18 ms, max ~467 ms при дешёвом GPU-draw ([`../baselines/04c-01-after.md`](../baselines/04c-01-after.md)).  
Сессия CDP+Rec: [`../baselines/06-cdp-hitch-session.md`](../baselines/06-cdp-hitch-session.md).

Правило логов: [`.cursor/rules/profiling.mdc`](../../../../.cursor/rules/profiling.mdc).

## Что следует из логов однозначно

| Утверждение | Доказательство | Однозначно? |
|-------------|----------------|:-----------:|
| Hitch **не** из‑за дорогого `stampGpu` / `draw.tool` | 32× `frame.interval` ≥ 50 ms; рядом draw+canvas span Σ **&lt; 10 ms** | **да** |
| GPU-путь на жесте жив | `stampGpu`×1921, `compositeLayerGpu`×595 | **да** |
| Autosave на main **дорогой** | `projects.autosave.serialize` 8×, max **1794** ms | **да** |
| Hotkeys постоянно rebind | log `hotkeys.alt+p` bind/unbind **5710** раз за ~80 s | **да** |
| В сессии был busy JS + GC | CDP: `keyboardjs`, React, `(garbage collector)` ~0.8 s self | **да** (итог сессии) |

## Что **не** однозначно (не писать как факт)

| Утверждение | Почему слабо |
|-------------|--------------|
| «Каждый hitch = keyboardjs» | CDP — sampling за всю сессию, нет привязки sample→конкретный hitch; Rec рядом с hitch часто видит hotkey-логи, но не длительность unbind |
| «Hitch = autosave» | Пересечение окна serialize с hitch: **только 2 из 32** |
| «Hitch = GC» | GC есть в CDP totals; нет longtask/hitch-meta с heap на каждый spike |
| «Те же причины, что max 467 ms в 04c-01» | Та сессия без CDP/All; класс тот же (дыра вне draw), виновник не доказан |

Итого простыми словами: **рисование на GPU не виновато** — это факт. **Кто именно съел каждый кадр** — смесь кандидатов; сильнее всего выглядят spam hotkeys + дорогой autosave + GC/alloc, но для починки достаточно чинить доказанный мусор и измерять снова.

## Цель

1. Убрать доказанный main-thread мусор (план ниже).
2. После фикса — повтор Rec All (+ CDP при сомнении); hitch ≥50 ms ↓, max interval ↓.
3. Опционально этап B (hitch-log), если после фикса1 останутся дыры без объяснения.

## Гипотезы (после сессии)

| # | Статус | Комментарий |
|---|--------|-------------|
| H1 main JS | **подтверждён как класс** | keyboardjs / React / ProfileLogger / cloneImageBuffer в CDP |
| H2 GC | **частично** | ~0.8 s self; не единственная причина всех 32 |
| H3 autosave | **дорого да; =все hitch — нет** | max 1.8 s; overlap 2/32 |
| H4 фон вкладки | **маловероятно** для этой сессии | busy JS есть |

## План устранения

Порядок = дешёвый выигрыш / ясная доказанность. После каждого пункта — короткий Rec Frame (или All), смотреть count hitch ≥50 и max `frame.interval`.

### 1. Hotkeys: не rebind на каждый render *(частично сделано)*

- Следствие логов: 5710 bind/unbind + CDP `KeyCombo._splitStr` / `Keyboard.unbind`.
- **Сделано (2026-09-22):** в [`GlobalHotkeysTriggers.tsx`](../../../../src/components/Hotkeys/GlobalHotkeysTriggers/GlobalHotkeysTriggers.tsx) массивы `keys` вынесены в константы модуля — стабильные ссылки, `AppHotkeyTrigger` не unbind/bind из‑за нового `[]` на каждый render.
- Ещё можно: сравнение keys по содержимому в `AppHotkeyTrigger` / `KeyTrigger`; урезать `profileHotkeyAltP` + `flushLatest` на bind.
- Готово когда: за 30 s жеста log bind/unbind ≪ сотен; в CDP keyboardjs не в топе. **Перезамер после фикса 1+2.**

### 2. Autosave: не блокировать кадр *(частично сделано)*

**Сделано (2026-09-22):**
- [`saveCurrentProject`](../../../../src/store/projects/actions.ts): если save уже идёт — новый вызов **коалесится** в него (`coalesced into in-flight save`), а не встаёт в очередь на второй полный save. `saveBeforeSwitch` — единственный, кто ждёт и пересохраняет (`resaveAfterInFlight`).
- [`projectAutosave.ts`](../../../../src/storage/projectAutosave.ts): вместо retry каждые 3 s во время busy — ожидание idle-события (`mouseup` → проверка `shouldDeferAutosave`). Retry остался только для ошибок/superseded. Стоп видео и так возвращает в обычный debounce.
- Undo-кадры в отдельном IndexedDB store `frames` (`[projectId, frameId]`); в JSON проекта — `{frameId}`; `current` inline. Повторный save не копирует и не base64-кодирует старые кадры. Тесты: `npm test` (`projectsDb.test.ts`, `projectFrames.test.ts`).
- **2c (2026-09-22):** persist в serialize-worker. Main только `serialize.build` + transfer; worker encode JSON, `ensure` кадров, `put` payload, GC. На main payload 9 MB не возвращается. Retry put в worker; `terminate` serialize = abandon. После persist — `yieldToUi` перед success Redux.

Осталось: after-замер hitch Rec **All** на сценарии «рисую, пока save заканчивается» (`frame.interval`, не wall-clock `persist`).


См. алгоритм ниже. Профиль: serialize до ~1.8 s; overlap с hitch 2/32 — дорого, но не единственная причина.

Цели фикса (не обязательно «выбросить всё»):
1. Во время drawing / video — **ноль** `serialize.build` / `idb put` на main.
2. Не гонять пачку save подряд (в сессии 4× на одном dirty-окне).
3. `build` (clone ImageData) — ужать или унести с critical path; worker уже есть.

Готово когда: на жесте нет `projects.autosave.serialize*` &gt; ~50 ms (или count=0 до отпускания мыши).

## Алгоритм autosave сейчас

Файлы: [`projectAutosave.ts`](../../../../src/storage/projectAutosave.ts), [`projects/actions.ts`](../../../../src/store/projects/actions.ts) (`saveCurrentProject`), [`projectSerializeClient.ts`](../../../../src/storage/projectSerializeClient.ts).

```text
Redux action (не из ignore-списка)
  → dirtyGeneration++
  → isDirty=true (если ещё не)
  → если drawing | video updating | START_UPDATING:
        cancel debounce; schedule retry через 3s
     иначе:
        debounce 1.5s → dispatch(saveCurrentProject)

saveCurrentProject:
  → persistProjectViaWorker
       MAIN: serialize.build (clone ImageData current + новых кадров)
       transfer → worker: JSON encode + ensure frames + put payload + GC
       worker → MAIN: ProjectMeta
  → yieldToUi
  → Redux list / lastSaved / dirty
  → если dirtyGeneration сменился за время save → scheduleAutosaveRetry снова
```

Константы: debounce **1500** ms, retry **3000** ms.

Defer: `isAnyPatternDrawing()` (canvas/mask drawing) или `video.params.updatingOn`. На busy — retry loop, не тишина до «отпустил мышь».

Игнор action: `projects/`, position, hotkeys, … — не ставят dirty.

Проблемы относительно hitch-сессии:
- **build на main** (`cloneImageBuffer` × history) — дорогая часть до worker; span `serialize.build` до ~84 ms, `serialize.worker` до ~1.7 s (ожидание worker + возможно structured clone остатков).
- **Retry while dirty** после save → пачки serialize (4× подряд).
- **Video updating** почти всегда on при живом видео → путь чаще retry, чем «спокойный» debounce; при отпускании жеста + видео может стрелять сериями.
- Defer drawing есть, но **не ждёт pointer-up**: каждые 3s снова пробует → если между штрихами пауза &gt;3s или drawing=false на кадр — save всё равно стартует.

Нужен ли полный rewrite? **Не обязательно с нуля.** Контракт (dirty → debounce → buffer → IDB) ок. Переделать **политику планирования + что делается на main**:
- один inflight save; coalescing (не retry-спам);
- save только после `drawing === false` N ms (и опционально video idle / редкий snapshot);
- не клонировать всю history на каждый autosave (инкремент / последний кадр / уже binary в IDB).

Полный rewrite имеет смысл, только если уходим на другой storage model (OPFS, per-pattern blobs). Для hitch — достаточно политики + ужима build.

### 3. Alloc / history → меньше GC *(средний)*

- Следствие: CDP `cloneImageBuffer` + `(garbage collector)`.
- Сделать: пул/`ImageData` reuse на `pushHistory`; не клонировать лишний раз на жесте.
- Готово когда: GC self в CDP заметно ниже на том же сценарии; hitch count ↓.

### 4. React hot path *(средний / по профилю)*

- Следствие: CDP `validateProperty` / `ButtonNumberCF` / Select*.
- Сделать: не гонять лишние CF/controls updates на каждый draw tick; стабильные props.
- Готово когда: React не в топе self на жесте без открытия панелей.

### 5. Не мешать себе Rec’ом *(низкий, процесс)*

- `ProfileLogger.persistSession` / огромный All-dump сам ест CPU.
- При замере FPS после фикса — **Frame**, не All; All только для охоты на причину.

### 6. Если после 1–3 hitch останутся

- Этап B: `frame.longTask` + `frame.hitch` meta (heap, autosaveInFlight).
- Повтор CDP на коротком окне вокруг воспроизводимого spike.

## Этап A — Rec All *(сделано)*

См. [`../baselines/06-cdp-hitch-session.md`](../baselines/06-cdp-hitch-session.md).

## Этап B — атрибуция в приложении *(опционально, после фикса 1–2)*

1. `PerformanceObserver` (`longtask`) → `frame.longTask`.
2. При `frame.interval ≥ 50`: `frame.hitch` + heap / autosaveInFlight.
3. Span на `history.push` / тяжёлый clone.

## Этап C — CDP *(tooling готово)*

`Profiler.enable` → start → stop → `profiling/cdp-latest.json` → `node scripts/summarizeCdpProfile.mjs profiling/cdp-latest.json`.

Протокол: lock → enable / setSamplingInterval(100) / start → unlock (жест) → lock → stop → cp → summarize → unlock.

## Чеклист

- [x] Rec All + CDP сессия, baseline
- [x] Зафиксировано: hitch ≠ GPU draw (однозначно)
- [x] Фикс 1 hotkeys: константы `keys` в `GlobalHotkeysTriggers.tsx` (стабильные ссылки)
- [ ] Фикс 1b (опц.): compare-by-value + убрать alt+p flush spam
- [x] Фикс 2a autosave: coalescing + idle вместо retry-loop
- [x] Фикс 2b autosave: frames store + refs; `npm test` (18)
- [x] Фикс 2c autosave: persist в serialize-worker (frames+payload+GC); payload не на main
- [ ] After-замер hitch Rec All: draw during save; `frame.interval` ≥ 50 у конца save / без `serialize.frames` на main
- [ ] Фикс 3 alloc/history (по необходимости)
- [ ] (опц.) этап B если дыры останутся

## After

Диагностика: [`../baselines/06-cdp-hitch-session.md`](../baselines/06-cdp-hitch-session.md).  
Фикс 1 (const keys) + 2a/2b (autosave coalesce/idle + frames) + 2c (persist in serialize-worker) — в коде. After-baseline hitch: Rec All, смотреть `frame.interval`, не длину wall-clock `persist`.
