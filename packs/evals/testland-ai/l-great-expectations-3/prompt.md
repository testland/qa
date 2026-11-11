---
description: Short prompt that should load great-expectations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We upgraded Great Expectations and all our old DataContext code broke. How does the new API work?
