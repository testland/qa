---
description: Short prompt that should load idempotency-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Customers double-click the Pay button and sometimes get charged twice. How do we test against duplicates?
