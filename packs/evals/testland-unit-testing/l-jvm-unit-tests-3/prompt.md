---
description: Short prompt that should load jvm-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We're still on JUnit 4 in a Kotlin service. What does moving to the current JUnit look like?
