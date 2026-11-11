---
description: Short prompt that should delegate to the observability-to-test agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

This Sentry error keeps firing in production: `TypeError: Cannot read properties of undefined (reading 'price')` in cart/summary.ts:88, 340 events since the 2.4 release. Turn it into a regression test.
