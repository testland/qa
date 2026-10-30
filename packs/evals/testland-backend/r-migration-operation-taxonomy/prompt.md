---
description: Should load migration-operation-taxonomy when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A pull request adds a migration that renames a column and adds a NOT NULL column with a default on a 200-million-row Postgres table. Which statements are safe to run in production?
