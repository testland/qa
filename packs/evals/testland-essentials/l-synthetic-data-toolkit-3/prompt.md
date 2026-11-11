---
description: Short prompt that should load synthetic-data-toolkit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We need a million realistic rows to load-test our Python service and Faker is way too slow. What should we use?
