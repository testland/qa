---
description: Short prompt that should delegate to the realtime-protocol-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check our webhook receiver and SSE handlers for missing signature checks and reconnect logic.
