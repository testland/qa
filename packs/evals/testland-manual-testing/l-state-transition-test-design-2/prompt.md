---
description: Short prompt that should load state-transition-test-design with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write test cases for this order lifecycle: Created, Paid, Shipped, Delivered, Cancelled. Orders can be cancelled before shipping, and refunded after delivery within 30 days.
