---
description: Short prompt that should load migration-operation-taxonomy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is it safe to add a NOT NULL column to a big Postgres table?
