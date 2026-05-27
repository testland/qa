#!/usr/bin/env python3
"""scripts/rating_check.py — rating + d6 enforcement.

Replaces the bash implementation (`rating-check.sh`) to gain ~10x speedup on
Windows MSYS2 and share frontmatter parsing with `validate.py`.

Enforces, per component (skill or agent):
  - rating: present, integer, 21 <= value <= 30
            (v2.0 30-point sub-total of D1+D2+D3+D4+D5+D6; importable bar at 21)
  - d6:     when present, integer 0-5; d6 == 0 is a hard reject
            (citation theater — see docs/REVIEWER_CHECKLIST.md "D6")

Framework version note (v2.0 vs v4.0):
  The active framework is v4.0 (8 dimensions, 0-40 scale, importable bar
  28/40). The `rating:` field intentionally stays on the v2.0 0-30 sub-total
  during the v4.0 shadow window. D7 (eval coverage) and D8 (best-practices
  adherence) are scored separately by `d8-audit.py`.

Output format is preserved byte-for-byte from the bash implementation so
that any external grep-based assertions keep working unchanged.

Usage: python3 scripts/rating_check.py [ROOT]
   ROOT defaults to the current directory.
"""
from __future__ import annotations

import os
import re
import sys

# Reuse validate.py's frontmatter helpers — avoids duplication.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate import extract_frontmatter, fm_field  # noqa: E402


def fail(file: str, reason: str, exit_holder: list[int]) -> None:
    print(f"FAIL ({file}): {reason}")
    exit_holder[0] = 1


def check_component(file: str, exit_holder: list[int]) -> None:
    with open(file, encoding="utf-8") as f:
        text = f.read()
    fm, _body = extract_frontmatter(text)
    rating = fm_field(fm, "rating")
    d6 = fm_field(fm, "d6")

    if not rating:
        fail(file, "missing 'rating' field in frontmatter", exit_holder)
        return

    if not re.match(r"^[0-9]+$", rating):
        fail(file, f"rating '{rating}' is not a non-negative integer", exit_holder)
        return

    rv = int(rating)
    if rv < 21:
        fail(file, f"rating {rating} < 21 (importable bar on v2.0 30-point scale)", exit_holder)
    if rv > 30:
        fail(file, f"rating {rating} > 30 (max on v2.0 scale)", exit_holder)

    if d6:
        if not re.match(r"^[0-9]+$", d6):
            fail(file, f"d6 '{d6}' is not a non-negative integer", exit_holder)
            return
        dv = int(d6)
        if dv == 0:
            fail(
                file,
                "d6 = 0 (terminology miscitation / citation theater — hard reject per docs/REVIEWER_CHECKLIST.md D6)",
                exit_holder,
            )
        elif dv > 5:
            fail(file, f"d6 {d6} > 5 (D6 sub-score range is 0-5)", exit_holder)


def iter_components(root: str):
    import glob

    patterns = [
        os.path.join(root, "plugins", "*", "skills", "*", "SKILL.md"),
        os.path.join(root, "plugins", "*", "agents", "*.md"),
    ]
    seen = set()
    for pat in patterns:
        for p in glob.glob(pat):
            norm = p.replace("\\", "/")
            if "/agents/" in norm and "/evals/" in norm:
                continue
            if norm not in seen:
                seen.add(norm)
                yield p


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    exit_holder = [0]
    for f in iter_components(root):
        check_component(f, exit_holder)
    if exit_holder[0] == 0:
        print("rating-check.sh: all components score >=21 with d6 >= 1")
    return exit_holder[0]


if __name__ == "__main__":
    sys.exit(main())
