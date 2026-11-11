---
description: Short prompt that should delegate to the test-environment-bootstrapper agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

We have a greenfield Node service with no test environment. Wire one up from scratch for integration and E2E tests.
