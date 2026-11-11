---
description: Short prompt that should load liquibase-migrations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add a rollback to this changeset.

```yaml
databaseChangeLog:
  - changeSet:
      id: 42
      author: dev
      changes:
        - addColumn:
            tableName: orders
            columns:
              - column: { name: currency, type: varchar(3) }
```
