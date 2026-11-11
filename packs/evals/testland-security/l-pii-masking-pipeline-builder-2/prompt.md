---
description: Short prompt that should load pii-masking-pipeline-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Plan the masking for this table before we copy it to staging.

```sql
CREATE TABLE customers (id bigint, full_name text, email text, phone text, dob date, iban text, notes text, created_at timestamptz);
```
