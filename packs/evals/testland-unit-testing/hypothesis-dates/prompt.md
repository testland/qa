---
description: Should load hypothesis-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write property-based tests in Python for a `parse_iso_date(s: str) -> date` and `format_iso_date(d: date) -> str` pair: the round trip must hold for every valid date.
