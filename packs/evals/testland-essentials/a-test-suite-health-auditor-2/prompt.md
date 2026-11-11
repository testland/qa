---
description: Short prompt that should delegate to the test-suite-health-auditor agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit our whole test suite: pyramid shape, flake rate per layer and which tiers are worth what they cost.
