---
description: Short prompt that should delegate to the concurrency-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review the concurrency in this PR's threading changes before we merge it.
