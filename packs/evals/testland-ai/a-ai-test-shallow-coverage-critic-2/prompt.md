---
description: Short prompt that should delegate to the ai-test-shallow-coverage-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit our test suite for shallow coverage: missing boundaries, error branches and negative cases.
