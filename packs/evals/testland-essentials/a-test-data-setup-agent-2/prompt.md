---
description: Short prompt that should delegate to the test-data-setup-agent agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

We need fixture factories and a reproducible seed dataset for the invoices feature in our Python app. Build it.
