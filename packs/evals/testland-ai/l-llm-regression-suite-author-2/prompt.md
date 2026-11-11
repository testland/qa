---
description: Short prompt that should load llm-regression-suite-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We're moving from one model to a newer one for our ticket classifier. Build a before/after quality gate. We have 3,000 labeled tickets.
