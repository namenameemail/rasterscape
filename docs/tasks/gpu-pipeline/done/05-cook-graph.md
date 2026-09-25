# Этап 5 — считать только если нужно

**Статус: закрыт** (2026-09-25). Перенесено в `done/`.

Словарь: [`../names.md`](../names.md). Это **не** [4c.11 present](04c-11-present.md): там цена копии на monitor; здесь — звать ли `onFrame` вообще.

## Было

`updatingOn` / `playingOn` → сразу подписка на `frameScheduler`. Скрытый слот уже без monitor (present молчит), но счёт видео/платформера шёл всё равно. Точка в навбаре = «включено», не «реально считается».

## Сделано

Cook = процесс вкл **и** (`visible` | `wanted` | `alwaysCook`).

- `visible` — активный слот / demonstration / monitor
- `wanted` — video source, DEPTH, кисть pattern, линия фон/trailing/pattern, платформер фон/игрок, room
- `alwaysCook` — тумблер в UI видео и платформера
- `syncPatternCook` — start/stop frame; при пробуждении сразу один кадр
- навбар: `shouldCookVideo` / `shouldCookPlatformer` (не голый `updatingOn`)

Скрытое забытое видео не ест кадр. Скрытый source для видимого потребителя считается (в т.ч. рекурсия линия «фон» ← видео ← тот же паттерн).

## Где

- [`cook/syncCook.ts`](../../../../src/store/patterns/cook/syncCook.ts)
- video / platformer `start`·`stop` / `startFrame`·`stopFrame`
- [`patternHasBackgroundActivity`](../../../../src/store/patterns/selectors.ts)

## Не входило

Сеть операторов как в TD; удешевление `present` (4c.11).
