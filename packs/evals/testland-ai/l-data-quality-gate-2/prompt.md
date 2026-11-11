---
description: Short prompt that should load data-quality-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Combine these results into one go/no-go for the pipeline.

- dbt: 2 failing tests (not_null on orders.customer_id: 14 rows; accepted_values on status: 1 row)
- Soda: freshness warn (3h late)
- Great Expectations: row count within bounds
