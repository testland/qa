---
description: Short prompt that should delegate to the schema-diff-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this schema migration for breaking changes and downstream impact.

```sql
ALTER TABLE customers RENAME COLUMN email TO email_address;
ALTER TABLE customers ADD COLUMN tier text;
ALTER TABLE orders ALTER COLUMN amount TYPE integer;
```
