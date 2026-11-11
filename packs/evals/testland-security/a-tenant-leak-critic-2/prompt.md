---
description: Short prompt that should delegate to the tenant-leak-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check the changed files in this PR for missing tenant filters and tenant IDs taken from user input.
