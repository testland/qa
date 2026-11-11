---
description: Short prompt that should load atlas-migrations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Set up Atlas to lint our migrations in CI for destructive changes.

```
migrations/
  20261101_add_orders.sql
  20261105_drop_legacy_column.sql
```
