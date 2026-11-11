---
description: Short prompt that should delegate to the migration-blast-radius-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Is this Liquibase changeset safe to run during business hours? Review it for locks and data loss.
