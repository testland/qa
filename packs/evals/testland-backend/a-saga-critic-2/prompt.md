---
description: Short prompt that should delegate to the saga-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit our event-sourcing and saga code in this PR for distributed transaction bugs.
