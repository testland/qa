---
description: Short prompt that should load mutant-survival-triage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

PIT report shows a surviving mutant: `changed conditional boundary` on `if (total > 100)`. What test is missing?
