---
description: Short prompt that should load faker-data with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests pass or fail depending on which random names Faker produces that run. How do we make them stable?
