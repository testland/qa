---
description: Short prompt that should load outbox-pattern-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Sometimes an order is saved but the OrderCreated event never gets published. How do we test for that?
