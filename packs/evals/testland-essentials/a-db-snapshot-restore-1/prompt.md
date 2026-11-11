---
description: Short prompt that should delegate to the db-snapshot-restore agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Our integration tests leave junk rows in Postgres and later tests fail. Set up a snapshot of a clean database and restore it before each test.
