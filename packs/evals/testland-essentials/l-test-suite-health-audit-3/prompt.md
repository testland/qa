---
description: Short prompt that should load test-suite-health-audit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Nobody has reviewed our tests in two years and leadership wants to know if we should delete or rewrite them. How do we assess it?
