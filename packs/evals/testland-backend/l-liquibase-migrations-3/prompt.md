---
description: Short prompt that should load liquibase-migrations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Liquibase update hangs on startup with 'Waiting for changelog lock'. What's going on?
