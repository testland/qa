---
description: Should load hypothesis-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add property-based tests in Python for our `parse_iso_date` / `format_iso_date` round trip.
