---
description: Short prompt that should delegate to the regression-suite-curator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Curate our regression suite: which tests should we keep, merge or delete based on the last year of results?
