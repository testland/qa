---
description: Short prompt that should load test-isolation-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our suite only passes when run in a fixed order. How do we make tests independent?
