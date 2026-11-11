---
description: Short prompt that should delegate to the bug-report-from-recording agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Build a structured bug report from this recording: console shows `TypeError: price is undefined` after clicking 'Apply coupon', network shows POST /api/coupon 500.
