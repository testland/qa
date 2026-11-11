---
description: Short prompt that should load test-pyramid-balancer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our suite has 120 unit tests (40s total), 60 integration tests (6 min) and 450 Selenium E2E tests (85 min). Is that balanced, and what should we change?
