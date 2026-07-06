#!/usr/bin/env bash
# scripts/validate.sh
#
# Thin dispatcher to scripts/validate.py. The actual lint implementation lives
# in Python for ~10x speedup on Windows MSYS2 and to share frontmatter parsing
# with content-audit.py. CI workflows and test-validate.sh
# continue to invoke this shell entry point unchanged.
#
# See scripts/validate.py for the lint rules.

DIR="$(cd "$(dirname "$0")" && pwd)"
for PY in python3 python; do
  if command -v "$PY" >/dev/null 2>&1; then
    exec "$PY" "$DIR/validate.py" "$@"
  fi
done

echo "FAIL: no python interpreter found (need python3 or python on PATH)" >&2
exit 2
