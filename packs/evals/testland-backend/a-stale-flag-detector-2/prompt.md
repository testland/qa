---
description: Short prompt that should delegate to the stale-flag-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

We have 140 feature flags and nobody knows which can be removed. Which are stale?
