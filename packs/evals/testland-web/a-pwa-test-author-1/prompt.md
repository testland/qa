---
description: Short prompt that should delegate to the pwa-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write a Playwright test that our PWA works offline after the first visit.
