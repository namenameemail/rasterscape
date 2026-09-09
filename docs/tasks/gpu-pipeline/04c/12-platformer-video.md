# 4c.12 — платформер: видео → world

Сейчас: кадр видео уходит в world через `drawImage` (GL → 2D world) каждый кадр, пока platformer + video.

## Сделать

Композит видео в world (или показ) без полного CPU roundtrip на кадр, насколько возможно при текущем world-буфере.

## Где

- `PatternVideoService` + platformer apply video frame
- спан `video.drawImage`

## Готово когда

Platformer + video: нет или резко меньше CPU `drawImage` полного кадра в world на каждый tick — либо world тоже на GPU ([14](14-platformer-display.md)).
