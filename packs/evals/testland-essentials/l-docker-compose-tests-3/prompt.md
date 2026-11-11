---
description: Short prompt that should load docker-compose-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our CI integration tests sometimes start before the database is ready and fail with connection refused. How do we fix the startup order?
