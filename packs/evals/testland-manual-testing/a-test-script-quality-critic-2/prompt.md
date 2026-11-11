---
description: Short prompt that should delegate to the test-script-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Critique our UAT scripts for vague steps and missing expected results before the business sign-off.
