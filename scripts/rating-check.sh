#!/usr/bin/env bash
# scripts/rating-check.sh
#
# Thin dispatcher to scripts/rating_check.py. The actual rating enforcement
# logic lives in Python (shares frontmatter parsing with validate.py and
# content-audit.py; ~10x faster on Windows MSYS2). CI workflows continue to
# invoke this shell entry point unchanged.
#
# See scripts/rating_check.py for the enforcement rules.

DIR="$(cd "$(dirname "$0")" && pwd)"
for PY in python3 python; do
  if command -v "$PY" >/dev/null 2>&1; then
    exec "$PY" "$DIR/rating_check.py" "$@"
  fi
done

echo "FAIL: no python interpreter found (need python3 or python on PATH)" >&2
exit 2
