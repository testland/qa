---
description: Short prompt that should delegate to the migration-blast-radius-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this migration's blast radius on a 300M-row table.

```sql
-- V42__orders.sql
ALTER TABLE orders ALTER COLUMN total TYPE numeric(12,2);
ALTER TABLE orders DROP COLUMN legacy_ref;
CREATE INDEX idx_orders_customer ON orders(customer_id);
```
