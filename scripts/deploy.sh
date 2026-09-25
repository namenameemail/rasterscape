#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGES="${PAGES_DIR:-$ROOT/../namenameemail.github.io}"
OUT="$PAGES/rasterscape"

if [ ! -d "$PAGES/.git" ]; then
  echo "deploy: pages repo not found: $PAGES" >&2
  exit 1
fi

cd "$ROOT"
echo "deploy: vite build (base ./)…"
npx vite build

echo "deploy: copy → $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -a dist/. "$OUT/"

cd "$PAGES"
BRANCH="$(git branch --show-current)"
git add rasterscape
if git diff --cached --quiet; then
  echo "deploy: nothing changed in rasterscape/"
  exit 0
fi

git commit -m "$(cat <<EOF
chore(rasterscape): update static build
EOF
)"

echo "deploy: push origin/$BRANCH…"
git push origin "$BRANCH"
echo "deploy: done — https://namenameemail.github.io/rasterscape/"
