#!/usr/bin/env bash
# scripts/new-plugin.sh
#
# Scaffold a new plugin from templates/plugin/ and append it to
# .claude-plugin/marketplace.json's plugins[] array.
#
# Usage:
#   bash scripts/new-plugin.sh <plugin-name> "<description>" <primary-keyword>
#
# Example:
#   bash scripts/new-plugin.sh qa-data-quality \
#     "Data quality testing for analytical pipelines: dbt-tests, Great Expectations, ..." \
#     data-quality

set -eu

NAME="${1:-}"
DESC="${2:-}"
KW="${3:-}"

if [[ -z "$NAME" || -z "$DESC" || -z "$KW" ]]; then
  echo "Usage: $0 <plugin-name> \"<description>\" <primary-keyword>" >&2
  exit 1
fi

if [[ ! "$NAME" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] || [[ "$NAME" == *--* ]]; then
  echo "ERROR: name '$NAME' must be kebab-case" >&2
  exit 1
fi

case "$NAME" in
  *anthropic*|*claude*)
    echo "ERROR: name '$NAME' contains reserved word (anthropic/claude)" >&2
    exit 1
    ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$REPO_ROOT/plugins/$NAME"
TEMPLATE="$REPO_ROOT/templates/plugin"
MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"

if [[ -d "$TARGET" ]]; then
  echo "ERROR: $TARGET already exists" >&2
  exit 1
fi

if [[ ! -d "$TEMPLATE" ]]; then
  echo "ERROR: template not found at $TEMPLATE" >&2
  exit 1
fi

PYTHON_BIN=""
for cand in python3 python; do
  if command -v "$cand" >/dev/null 2>&1; then
    PYTHON_BIN="$cand"
    break
  fi
done
if [[ -z "$PYTHON_BIN" ]]; then
  echo "ERROR: python3 (or python) is required for marketplace.json substitution" >&2
  exit 1
fi

cp -r "$TEMPLATE" "$TARGET"

# Substitute placeholders in plugin.json + README.md using python (cross-platform-safe;
# avoids the GNU/BSD sed -i incompatibility).
"$PYTHON_BIN" - "$TARGET" "$NAME" "$DESC" "$KW" <<'PYEOF'
import sys
from pathlib import Path

target = Path(sys.argv[1])
name = sys.argv[2]
desc = sys.argv[3]
kw   = sys.argv[4]

for rel in (".claude-plugin/plugin.json", "README.md"):
    p = target / rel
    text = p.read_text(encoding="utf-8")
    text = text.replace("PLUGIN_NAME_KEBAB", name)
    text = text.replace("ONE_LINE_DESCRIPTION_HERE", desc)
    text = text.replace("PRIMARY_KEYWORD", kw)
    p.write_text(text, encoding="utf-8")
PYEOF

# Append to marketplace.json plugins[].
"$PYTHON_BIN" - "$MARKETPLACE" "$NAME" "$DESC" <<'PYEOF'
import json, sys
from pathlib import Path

mp_path = Path(sys.argv[1])
name    = sys.argv[2]
desc    = sys.argv[3]

m = json.loads(mp_path.read_text(encoding="utf-8"))
m.setdefault("plugins", [])

# Refuse duplicates.
for p in m["plugins"]:
    if p.get("name") == name:
        sys.stderr.write(f"ERROR: '{name}' already present in marketplace.json plugins[]\n")
        sys.exit(1)

m["plugins"].append({
    "name": name,
    "source": f"./plugins/{name}",
    "description": desc,
    "strict": True,
})

mp_path.write_text(json.dumps(m, indent=2) + "\n", encoding="utf-8")
PYEOF

echo "Scaffolded plugins/$NAME"
echo "Next steps:"
echo "  1. Add components under plugins/$NAME/agents/ or plugins/$NAME/skills/"
echo "  2. Run: bash scripts/validate.sh"
echo "  3. When all components land, bump plugin.json version 0.1.0 -> 1.0.0"
