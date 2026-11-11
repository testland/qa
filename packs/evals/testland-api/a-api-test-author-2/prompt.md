---
description: Short prompt that should delegate to the api-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Author a test file for our GET /users/{id} endpoint: 200 for an existing user, 404 for a missing one, 401 without a token.
