---
description: Short prompt that should delegate to the data-anomaly-triager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Classify this failure and tell me who owns it.

```
dbt test: not_null_orders_customer_id FAIL 1,412 rows (yesterday 0)
model: orders, source: shop_db.orders, last load 05:10 UTC
```
