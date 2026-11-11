---
description: Short prompt that should delegate to the schema-diff-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Before we merge this dbt model change, check it for breaking schema changes and missing data tests.
