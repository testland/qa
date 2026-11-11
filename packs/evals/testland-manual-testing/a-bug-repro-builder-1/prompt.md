---
description: Short prompt that should delegate to the bug-repro-builder agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Turn this bug report into a minimal failing test: 'Applying coupon SAVE10 twice gives 20% off instead of 10%.'
