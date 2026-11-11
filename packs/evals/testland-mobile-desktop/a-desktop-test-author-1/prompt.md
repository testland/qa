---
description: Short prompt that should delegate to the desktop-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write UI tests for our WPF invoicing app: create an invoice, add two lines and check the total.
