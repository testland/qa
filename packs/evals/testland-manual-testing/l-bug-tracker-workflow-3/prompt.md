---
description: Short prompt that should load bug-tracker-workflow with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our bug dashboard counts fixed bugs as new ones and misses critical bugs filed in another project. How do we fix the workflow?
