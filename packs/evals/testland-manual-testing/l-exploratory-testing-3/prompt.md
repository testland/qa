---
description: Short prompt that should load exploratory-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our scripted regression suite passes every time but customers still find bugs in production. How do we find what scripts miss?
