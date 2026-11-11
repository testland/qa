---
description: Short prompt that should load test-data-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our shared test fixtures are changed by one test and break ten others. How should we structure test data?
