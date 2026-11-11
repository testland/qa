---
description: Short prompt that should delegate to the ci-pipeline-health-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check our GitHub Actions workflow for test anti-patterns like retries that hide flakiness or missing cancel-on-push.
