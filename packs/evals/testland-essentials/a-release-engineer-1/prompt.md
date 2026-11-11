---
description: Short prompt that should delegate to the release-engineer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Run our release for v2.8.0: smoke suite, 10% canary for 30 minutes, then promote if error rate stays under 0.5%.
