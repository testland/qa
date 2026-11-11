---
description: Short prompt that should load jenkinsfile-test-stages with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Two Jenkins jobs run tests against the same staging database at once and corrupt each other's data. How do we stop that?
