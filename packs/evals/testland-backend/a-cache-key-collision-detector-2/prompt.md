---
description: Short prompt that should delegate to the cache-key-collision-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check our caching code for keys that are missing the tenant or user ID.
