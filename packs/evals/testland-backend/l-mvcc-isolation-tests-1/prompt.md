---
description: Short prompt that should load mvcc-isolation-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Which isolation level prevents write skew in PostgreSQL?
