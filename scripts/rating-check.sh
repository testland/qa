#!/usr/bin/env bash
# scripts/rating-check.sh
#
# Reads YAML frontmatter from each component (skill or agent) and enforces:
#   - rating: present, integer, >= 21 and <= 30
#             (the v2.0 30-point sub-total of D1+D2+D3+D4+D5+D6, with importable
#             bar at 21 — i.e., ~70% of v2.0 scale)
#   - d6:     when present, integer 0-5; d6 == 0 is a hard reject
#             (citation theater — see docs/REVIEWER_CHECKLIST.md "D6")
#
# Framework version note (v2.0 vs v4.0):
#   The active framework is v4.0 (8 dimensions, 0-40 scale, importable bar
#   28/40) — see docs/REVIEWER_CHECKLIST.md and the v4.0 framework spec at
#   elv1s42k-qa-research/qa-rating-framework-2026-05-25.md.
#
#   The `rating:` field in component frontmatter intentionally stays on the
#   v2.0 0-30 sub-total during the v4.0 shadow window. D7 (eval coverage)
#   and D8 (best-practices adherence) are scored separately:
#     - D7 evals: presence of plugins/<p>/agents/<a>/evals/evals.md
#                 (audited by d8-audit.py; hard-gates merges after 2026-06-01)
#     - D8 hygiene: audited by d8-audit.py; hard-gates merges after 2026-07-01
#
#   So rating <= 30 is the correct upper bound here — the v4.0 D7/D8 points
#   are NOT folded into this field. When the framework decides to merge the
#   sub-totals into a single 0-40 rating value, this upper bound widens to 40
#   and the importable bar moves to 28.
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
# Note: the `! -path "*/agents/*/evals/*"` exclusion above skips eval files that
# live in per-agent subdirectories. They carry only `component`/`type`/`archetype`
# frontmatter (see qa-rating-framework §"Eval file shape") — they are not
# first-class agents and have no rating to check.

if [[ $EXIT -eq 0 ]]; then
  echo "rating-check.sh: all components score >=21 with d6 >= 1"
fi
exit $EXIT
