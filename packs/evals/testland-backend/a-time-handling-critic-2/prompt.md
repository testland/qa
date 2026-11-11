---
description: Short prompt that should delegate to the time-handling-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review the date and time handling in this PR for naive datetimes and DST problems.
