# 6 — диагностика зависаний кадра (hitch)

**Статус: открыт** (метод + tooling; фикс причины — после локализации).

Не путать с «дорогим кадром»: hitch = **дыра между** `requestAnimationFrame`, когда `draw.*` / `canvas.*` дешёвые, а `frame.interval` сотни ms.

Симптом после 4c.01: avg interval ~18 ms, max ~467 ms при `stampGpu`/`compositeLayerGpu` 1–3 ms ([`baselines/04c-01-after.md`](baselines/04c-01-after.md)).

Правило логов: [`.cursor/rules/profiling.mdc`](../../../.cursor/rules/profiling.mdc) — читать `profiling/latest.json`, не консоль.

## Цель

1. Повторяемо ловить hitch без ручного Performance в DevTools.
2. Отличить: GC / history alloc / autosave / layout / «просто tab background».
3. Зафиксировать причину в baseline; фикс — отдельный коммит/задача.

## Гипотезы (порядок проверки)

| # | Гипотеза | Признак |
|---|----------|---------|
| H1 | Main-thread JS (history `ImageData`, serialize) | CDP Profiler: стек в нашем коде на интервале hitch; в Rec All — span рядом по `ts` |
| H2 | GC после alloc | long task без «толстого» нашего стека; рост `usedJSHeapSize` перед hitch; в полном Performance — GC |
| H3 | Autosave / worker postMessage на main | span `projects.autosave.*` / `autosave.*` пересекается с hitch |
| H4 | Вне рендера (фон вкладки, OS) | большой `frame.interval`, нет long task, нет стека, heap ровный |

Frame Rec (set **Frame**) Hitch **видит**, но **не объясняет** — save/history в set не попадают.

## Этап A — Rec All (без кода)

1. Debug overlay: set **All**, **Rec**.
2. 10–20 s жеста, пока не поймается зависание.
3. Stop → Save → агент читает [`profiling/latest.json`](../../../../profiling/latest.json).
4. Найти `frame.interval` ≥ 50 ms; вокруг того же `frame` / `ts` — какие span’ы (`projects.*`, `draw.pushFrameRelatedEvent`, …).

Артефакт: `baselines/06-hitch-<label>.md` + урезанный `.session.json` (summary + entries вокруг hitch, не весь dump).

## Этап B — атрибуция в приложении (сделать)

Чтобы не гадать по соседним span’ам:

1. `PerformanceObserver` (`longtask`) → `profileLogger.value('frame.longTask', durationMs)` (или span).
2. При `frame.interval ≥ 50`: одна log-запись `frame.hitch` с meta:
   - `intervalMs`, `frame`
   - `heapUsed` / `heapTotal` если есть `performance.memory`
   - `autosaveInFlight` (флаг из autosave)
   - опционально список имён span’ов предыдущего кадра
3. Span’ы на горячих подозреваемых (если ещё нет): `history.push`, тяжёлый alloc / `getImageData` на undo-пути — префиксы, попадающие в **All** (и при необходимости в **Frame**, если оставим `frame.` / отдельный `history.` в set).

Критерий готовности B: в `latest.json` у hitch есть longTask и/или hitch-log; можно сказать H1 vs H2 vs H3 без DevTools.

## Этап C — CDP Profiler (агент снимает сам)

**CDP** = Chrome DevTools Protocol. Домен **Profiler** = CPU sampling (как CPU profile в DevTools), без клика по UI Performance.

### Когда

Этап A/B показал hitch, но не ясно **какой JS**. Profiler не замена long task + heap для чистого GC (H2) — для H2 лучше полный Performance / Tracing.

### Настройка (Cursor browser MCP)

Вкладка с приложением уже открыта (dev server). Инструмент: `browser_cdp` (`cursor-ide-browser`).

Порядок:

1. `browser_tabs` → нужный URL приложения.
2. `browser_lock` `{ action: "lock" }` перед серией CDP (если уже есть вкладка).
3. CDP:
   - `Profiler.enable`
   - `Profiler.setSamplingInterval` — опционально, params `{ interval: 100 }` (µs; меньше = точнее и тяжелее)
   - `Profiler.start`
4. Пользователь (или агент мышью) воспроизводит жест 5–15 s, пока hitch.
5. CDP `Profiler.stop` → в ответе / файле профиль (`profile` / `log_file`).
6. Агент читает файл: top functions / call tree на интервале.
7. `browser_lock` `{ action: "unlock" }`.

Параллельно можно Rec All → потом сопоставить wall-time hitch из `latest.json` с окном профиля.

Не использовать CDP `Input.*` (запрещены в MCP); клики — через `browser_click` / `browser_mouse_click_xy`.

### Куда класть артефакт

`docs/tasks/gpu-pipeline/baselines/06-cdp-<label>.md` — дата, сценарий, top stacks, вывод (H1/H2/…).  
Сырой профиль — только если небольшой; иначе summary в md, файл вне git / в `profiling/` (gitignore).

### Ограничения

| Инструмент | Даёт | Не даёт |
|------------|------|---------|
| Rec Frame | interval, draw/gpu spans | autosave, GC |
| Rec All + hitch log | корреляция span/heap/longtask | точный GC track |
| CDP Profiler | стек JS на main | GC/layout как в Performance |
| DevTools Performance / CDP Tracing | GC, Long Tasks, layers | нужен вручную или отдельная обвязка Tracing |

## Этап D — фикс

После локализации: отдельная задача/PR (пул буферов history, реже autosave, меньше alloc на жесте, …). Эта задача **не** включает фикс до доказанной причины.

## Чеклист сессии

- [ ] Rec **All**, hitch пойман, `latest.json` сохранён
- [ ] (опц.) этапы B в коде
- [ ] при нужде — CDP Profiler по протоколу выше
- [ ] baseline `06-hitch-*` с вердиктом H1–H4
- [ ] ссылка на baseline из этой задачи в «After»

## After

_(пусто до первого вердикта)_
