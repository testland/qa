---
description: Short prompt that should load celery-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Celery tests pass with task_always_eager but the task fails in production. Why?
