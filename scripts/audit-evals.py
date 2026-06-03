#!/usr/bin/env python3
"""scripts/audit-evals.py — verify D7 eval files are well-formed.

Complements scripts/d8-audit.py (which only checks file presence). This
script verifies the *contents* of every `plugins/<p>/agents/<a>/evals/evals.md`
file:

  - frontmatter present with 2 required fields (component, type)
  - body contains >=3 eval headings (`## Eval N`)
  - body contains all four required phrases: Input:, Target models:,
    Expected:, Pass condition:

Run after backfilling evals or before promoting D7 to hard-gate (2026-06-01)
to confirm structural quality, not just presence.

Usage: python3 scripts/audit-evals.py
Exits 0 if all eval files pass; 1 if any issues found.
"""
from __future__ import annotations

import glob
import re
import sys


def main() -> int:
    eval_files = sorted(glob.glob("plugins/*/agents/*/evals/evals.md"))
    print(f"Total eval files: {len(eval_files)}")

    issues: list[tuple[str, str]] = []
    for p in eval_files:
        with open(p, encoding="utf-8") as f:
            text = f.read()
        norm = p.replace("\\", "/")

        parts = text.split("---", 2)
        if len(parts) < 3:
            issues.append((norm, "no frontmatter"))
            continue
        fm = parts[1]
        body = parts[2]

        missing = []
        for field in ("component", "type"):
            if not re.search(rf"^{field}:\s*\S", fm, re.MULTILINE):
                missing.append(field)
        if missing:
            issues.append((norm, f"missing frontmatter fields: {missing}"))

        eval_headings = re.findall(r"^## Eval \d+", body, re.MULTILINE)
        if len(eval_headings) < 3:
            issues.append((norm, f"only {len(eval_headings)} eval headings"))

        for ph in ("Input:", "Target models:", "Expected:", "Pass condition:"):
            if ph not in body:
                issues.append((norm, f"missing phrase: {ph}"))
                break

    print()
    if issues:
        print(f"Issues found: {len(issues)}")
        for path, reason in issues[:30]:
            print(f"  - {path}: {reason}")
        if len(issues) > 30:
            print(f"  ... ({len(issues)-30} more)")
        return 1
    print("All eval files well-formed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
