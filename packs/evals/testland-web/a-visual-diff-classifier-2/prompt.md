---
description: Short prompt that should delegate to the visual-diff-classifier agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review these Chromatic diffs and tell me which ones are real regressions.
