---
description: Should load decision-table-test-design when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Shipping cost depends on membership tier, basket value and destination country. Design test cases that cover the rule combinations without testing every one.
