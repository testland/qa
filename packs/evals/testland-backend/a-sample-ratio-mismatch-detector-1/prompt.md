---
description: Short prompt that should delegate to the sample-ratio-mismatch-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our 50/50 A/B test ended with 50,912 users in control and 48,731 in treatment. Is that a sample ratio mismatch?
