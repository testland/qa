---
description: Short prompt that should delegate to the ci-defect-filer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Turn tonight's failed Playwright tests into deduplicated GitHub issues.
