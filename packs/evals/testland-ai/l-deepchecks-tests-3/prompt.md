---
description: Short prompt that should load deepchecks-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our model scored 99% accuracy offline and 60% in production. What data problem should we check first?
