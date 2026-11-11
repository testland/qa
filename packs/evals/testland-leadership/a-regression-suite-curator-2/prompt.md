---
description: Short prompt that should delegate to the regression-suite-curator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review our 3,000 regression tests and recommend keep, fold or delete for each based on whether they ever caught a real bug.
