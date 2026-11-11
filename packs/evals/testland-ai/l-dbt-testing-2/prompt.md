---
description: Short prompt that should load dbt-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add tests to this dbt model.

```yaml
models:
  - name: orders
    columns:
      - name: order_id
      - name: status
      - name: customer_id
```
