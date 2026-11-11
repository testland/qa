---
description: Short prompt that should delegate to the playwright-codegen-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Refactor our Cypress Studio recordings into maintainable tests.
