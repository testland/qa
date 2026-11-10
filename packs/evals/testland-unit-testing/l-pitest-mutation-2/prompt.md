---
description: Short prompt that should load pitest-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Configure PIT in Gradle for a Kotlin service and fail the build below 70% mutation score.
