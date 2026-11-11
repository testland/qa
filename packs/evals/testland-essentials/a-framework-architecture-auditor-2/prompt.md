---
description: Short prompt that should delegate to the framework-architecture-auditor agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review our Playwright framework's structure before we refactor it: page objects, base classes, fixtures and helpers.
