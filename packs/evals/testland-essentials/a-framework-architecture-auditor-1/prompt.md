---
description: Short prompt that should delegate to the framework-architecture-auditor agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit the architecture of our test framework: 45 page objects, a 900-line BaseTest class with 60 helpers, fixtures that log in through the UI, and three different wait helpers.
