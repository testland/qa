---
description: Short prompt that should delegate to the flag-coverage-gap-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Which of our feature flags have an OFF path or variant that no test exercises?
