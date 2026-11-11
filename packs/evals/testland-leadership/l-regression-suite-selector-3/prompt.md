---
description: Short prompt that should load regression-suite-selector with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

PR builds take forever because we run all 6,000 tests every time. How do we cut that without missing regressions?
