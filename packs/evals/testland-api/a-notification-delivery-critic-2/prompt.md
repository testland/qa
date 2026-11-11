---
description: Short prompt that should delegate to the notification-delivery-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check our notification send paths for missing idempotency keys and bounce handling.
