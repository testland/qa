---
description: Short prompt that should delegate to the async-job-health-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check the queue and worker changes in this PR for missing retry limits, dead-letter queues and non-idempotent handlers.
