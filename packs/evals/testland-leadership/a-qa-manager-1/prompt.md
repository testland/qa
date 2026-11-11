---
description: Short prompt that should delegate to the qa-manager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write this week's quality status digest from CI history, the bug tracker and the quarantine list, with red, amber or green per team.
