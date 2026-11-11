---
description: Short prompt that should delegate to the relevance-regression-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this search relevance change: we swapped the embedding model. Run our judgment list before and after and flag regressions.
