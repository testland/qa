---
description: Short prompt that should load flyway-migrations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Flyway fails with this error. What do I do?

```
ERROR: Validate failed: Migrations have failed validation
Migration checksum mismatch for migration version 3
-> Applied to database : 1213489126
-> Resolved locally    : -1845021122
```
