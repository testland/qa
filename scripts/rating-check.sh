#!/usr/bin/env bash
# scripts/rating-check.sh
#
# Reads YAML frontmatter from each component (skill or agent) and enforces:
#   - rating: present, integer, >= 21 (importable bar on the v2.0 30-point scale)
#   - d6:     when present, integer 0-5; d6 == 0 is a hard reject
#             (citation theater — see docs/REVIEWER_CHECKLIST.md "D6")
#
# v2.0: rating range is 0-30 with the importable bar at 21 after D6
# Terminology Compliance was added. This script reads both fields, fails on
# missing rating, and fails on d6=0 regardless of total.
#
# Usage: bash scripts/rating-check.sh [ROOT]
#   ROOT defaults to the current directory.

set -u

ROOT="${1:-.}"
EXIT=0

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

fm_field() {
  local fm="$1" key="$2"
  echo "$fm" \
    | grep -E "^${key}:" \
    | head -1 \
    | sed "s/^${key}:[[:space:]]*//" \
    | sed 's/^"//;s/"$//' \
    | sed "s/^'//;s/'$//"
}

while IFS= read -r -d '' file; do
  fm=$(extract_frontmatter "$file")
  rating=$(fm_field "$fm" rating)
  d6=$(fm_field "$fm" d6)

  if [[ -z "$rating" ]]; then
    echo "FAIL ($file): missing 'rating' field in frontmatter"
    EXIT=1
    continue
  fi

  if ! [[ "$rating" =~ ^[0-9]+$ ]]; then
    echo "FAIL ($file): rating '$rating' is not a non-negative integer"
    EXIT=1
    continue
  fi

  if [[ "$rating" -lt 21 ]]; then
    echo "FAIL ($file): rating $rating < 21 (importable bar on v2.0 30-point scale)"
    EXIT=1
  fi

  if [[ "$rating" -gt 30 ]]; then
    echo "FAIL ($file): rating $rating > 30 (max on v2.0 scale)"
    EXIT=1
  fi

  # D6 hard-reject check: if the field is present and equal to 0, block merge.
  if [[ -n "$d6" ]]; then
    if ! [[ "$d6" =~ ^[0-9]+$ ]]; then
      echo "FAIL ($file): d6 '$d6' is not a non-negative integer"
      EXIT=1
    elif [[ "$d6" -eq 0 ]]; then
      echo "FAIL ($file): d6 = 0 (terminology miscitation / citation theater — hard reject per docs/REVIEWER_CHECKLIST.md D6)"
      EXIT=1
    elif [[ "$d6" -gt 5 ]]; then
      echo "FAIL ($file): d6 $d6 > 5 (D6 sub-score range is 0-5)"
      EXIT=1
    fi
  fi
done < <(
  find "$ROOT/plugins" -type f \
    \( -name "SKILL.md" -o -path "*/agents/*.md" \) \
    ! -path "*/agents/*/evals/*" \
    -print0 2>/dev/null
)

if [[ $EXIT -eq 0 ]]; then
  echo "rating-check.sh: all components score >=21 with d6 >= 1"
fi
exit $EXIT
