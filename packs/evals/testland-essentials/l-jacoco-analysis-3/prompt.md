---
description: Short prompt that should load jacoco-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Kotlin project's coverage report is empty in CI even though tests run. What's wrong?
