---
description: Short prompt that should delegate to the test-case-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review the test cases in our TestRail project for missing preconditions and vague expected results.
