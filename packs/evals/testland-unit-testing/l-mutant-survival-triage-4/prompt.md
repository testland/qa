---
description: Short prompt that should load mutant-survival-triage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Mutation testing says `return a + b` became `return a - b` and survived. What does that mean?
