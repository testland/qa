---
description: Should load jacoco-analysis when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add code coverage to a Gradle Kotlin project: HTML and XML reports, and fail the build if line coverage drops below 80%.
