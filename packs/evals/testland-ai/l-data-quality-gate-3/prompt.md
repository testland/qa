---
description: Short prompt that should load data-quality-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Bad data reached our finance dashboard because the pipeline only logged test failures. How do we block the load?
