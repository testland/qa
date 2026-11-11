---
description: Short prompt that should load soda-checks with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write SodaCL checks for this Snowflake table: orders must arrive within 2 hours, amount must be positive, no duplicate order_id, and row count over 1,000 per day.
