---
description: Should load atlas-migrations when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Set up declarative schema management for a Postgres database: the schema lives in one HCL file, migrations are generated from diffs, and CI lints them for destructive changes.
