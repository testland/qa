---
description: Should load state-transition-test-design when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

An order can be created, paid, shipped, delivered, cancelled or refunded. Design manual test cases that cover the valid and invalid status changes.
