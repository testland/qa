---
description: Short prompt that should load decision-table-test-design with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write test cases for this rule: free shipping if the order is over $50 and the customer is in the US, or if the customer is a Plus member anywhere; never for oversized items.
