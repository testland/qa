---
description: Short prompt that should load testcontainers with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our integration tests share one database container and fail when they run in parallel. How do we isolate them?
