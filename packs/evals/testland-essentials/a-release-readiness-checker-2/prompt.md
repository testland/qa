---
description: Short prompt that should delegate to the release-readiness-checker agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Give me a go or no-go for Friday's release across all our gates: smoke, coverage, open critical bugs, migration dry-run.
