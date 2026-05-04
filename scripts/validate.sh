#!/usr/bin/env bash
# scripts/validate.sh
#
# Lint rules per decisions.md 2026-04-30 ("Anti-pattern guard"):
#   - Names: kebab-case, 1-64 chars, no anthropic/claude reserved words
#   - Descriptions: present, third-person, no "You are..." / "I help..."
#   - Description != slug
#   - No literal placeholder strings (DESCRIPTION_PLACEHOLDER, CONTENT_PLACEHOLDER, TODO, FIXME)
#   - No vague auto-gen pattern "Use when working with X tasks or workflows"
#   - Command files must have a non-empty body
#   - Generic role-agent names rejected (qa-expert, qa-engineer, quality-engineer, ...)
#   - All plugin.json + marketplace.json files parse as valid JSON
#
# Usage: bash scripts/validate.sh [ROOT]
#   ROOT defaults to the current directory.

set -u

ROOT="${1:-.}"
EXIT=0

# Extract the YAML frontmatter block (everything between the first pair of `---` lines)
# from a markdown file, or empty string if none.
extract_frontmatter() {
  awk '
    BEGIN   { c = 0 }
    /^---[[:space:]]*$/ {
      c++
      next
    }
    c == 1  { print }
    c >= 2  { exit }
  ' "$1"
}

# Extract the body (everything after the closing `---` line of the frontmatter).
extract_body() {
  awk '
    BEGIN   { c = 0 }
    /^---[[:space:]]*$/ {
      c++
      next
    }
    c >= 2  { print }
  ' "$1"
}

# Read a single value from frontmatter (first match wins).
fm_field() {
  local fm="$1" key="$2"
  echo "$fm" \
    | grep -E "^${key}:" \
    | head -1 \
    | sed "s/^${key}:[[:space:]]*//" \
    | sed 's/^"//;s/"$//' \
    | sed "s/^'//;s/'$//"
}

check_yaml_frontmatter() {
  local file="$1"
  local fm
  fm=$(extract_frontmatter "$file")

  if [[ -z "$fm" ]]; then
    echo "FAIL ($file): missing YAML frontmatter"
    EXIT=1
    return
  fi

  local name desc
  name=$(fm_field "$fm" name)
  desc=$(fm_field "$fm" description)

  # Rule 1: name present
  if [[ -z "$name" ]]; then
    echo "FAIL ($file): missing name in frontmatter"
    EXIT=1
    return
  fi

  # Rule 2: kebab-case (lowercase a-z, 0-9, hyphen; no leading/trailing hyphen; no doubled hyphens)
  if [[ ! "$name" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] || [[ "$name" == *--* ]]; then
    echo "FAIL ($file): name '$name' is not kebab-case"
    EXIT=1
  fi

  # Rule 3: 1-64 chars
  if [[ ${#name} -lt 1 ]] || [[ ${#name} -gt 64 ]]; then
    echo "FAIL ($file): name '$name' length out of range (1-64)"
    EXIT=1
  fi

  # Rule 4: reserved words
  case "$name" in
    *anthropic*|*claude*)
      echo "FAIL ($file): name '$name' contains reserved word (anthropic/claude)"
      EXIT=1
      ;;
  esac

  # Rule 5: generic role-agent names (decisions.md anti-pattern guard)
  case "$name" in
    qa-expert|qa-engineer|quality-engineer|test-automator|qa-lead|qa-specialist|qa-pro|qa-master)
      echo "FAIL ($file): generic role-agent name '$name' (use a sharp task scope instead)"
      EXIT=1
      ;;
  esac

  # Rule 6: description present
  if [[ -z "$desc" ]]; then
    echo "FAIL ($file): empty description"
    EXIT=1
    return
  fi

  # Rule 7: not "You are..." / "I help..."
  local desc_lower
  desc_lower=$(echo "$desc" | tr '[:upper:]' '[:lower:]')
  if [[ "$desc_lower" == "you are"* ]] || [[ "$desc_lower" == "i help"* ]]; then
    echo "FAIL ($file): description starts with 'You are...' or 'I help...' (use third-person, action-oriented)"
    EXIT=1
  fi

  # Rule 8: description != slug
  if [[ "$desc" == "$name" ]]; then
    echo "FAIL ($file): description equals slug"
    EXIT=1
  fi

  # Rule 9: no auto-gen pattern
  case "$desc" in
    *"Use when working with"*"tasks or workflows"*)
      echo "FAIL ($file): vague auto-gen description pattern"
      EXIT=1
      ;;
  esac
}

check_no_placeholders() {
  local file="$1"
  if grep -qE 'DESCRIPTION_PLACEHOLDER|CONTENT_PLACEHOLDER' "$file"; then
    echo "FAIL ($file): contains placeholder string (DESCRIPTION_PLACEHOLDER / CONTENT_PLACEHOLDER)"
    EXIT=1
  fi
  # Match TODO / FIXME only as standalone tokens (avoid false positives in docs about TODO).
  if grep -qE '(^|[[:space:]])(TODO|FIXME)([[:space:]]|$)' "$file" 2>/dev/null; then
    # Allow these tokens in references/ subdirectories (documentation about how to mark TODOs).
    case "$file" in
      */references/*) : ;;
      *)
        echo "FAIL ($file): contains literal TODO/FIXME token"
        EXIT=1
        ;;
    esac
  fi
}

check_empty_command_body() {
  local file="$1"
  local body
  body=$(extract_body "$file" | tr -d '[:space:]')
  if [[ -z "$body" ]]; then
    echo "FAIL ($file): command has empty body"
    EXIT=1
  fi
}

# ----- Walk skills, agents, commands -----
while IFS= read -r -d '' file; do
  check_yaml_frontmatter "$file"
  check_no_placeholders "$file"
done < <(
  find "$ROOT/plugins" -type f \
    \( -name "SKILL.md" -o -path "*/agents/*.md" -o -path "*/commands/*.md" \) \
    -print0 2>/dev/null
)

# ----- Empty-body check applies only to commands -----
while IFS= read -r -d '' file; do
  check_empty_command_body "$file"
done < <(
  find "$ROOT/plugins" -type f -path "*/commands/*.md" -print0 2>/dev/null
)

# ----- JSON syntax check (marketplace.json + every plugin.json) -----
PYTHON_BIN=""
for cand in python3 python; do
  if command -v "$cand" >/dev/null 2>&1; then
    PYTHON_BIN="$cand"
    break
  fi
done

if [[ -n "$PYTHON_BIN" ]]; then
  json_files=()
  if [[ -f "$ROOT/.claude-plugin/marketplace.json" ]]; then
    json_files+=("$ROOT/.claude-plugin/marketplace.json")
  fi
  while IFS= read -r -d '' f; do
    json_files+=("$f")
  done < <(find "$ROOT/plugins" -type f -name "plugin.json" -print0 2>/dev/null)

  for json in "${json_files[@]}"; do
    if ! "$PYTHON_BIN" -c "import json,sys; json.load(open(sys.argv[1]))" "$json" 2>/dev/null; then
      echo "FAIL ($json): invalid JSON syntax"
      EXIT=1
    fi
  done
else
  echo "WARN: no python interpreter found; skipping JSON syntax checks"
fi

if [[ $EXIT -eq 0 ]]; then
  echo "validate.sh: all checks passed"
fi
exit $EXIT
