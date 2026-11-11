---
description: Short prompt that should load allure-reports with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our JUnit reports just say 'failed' with a stack trace and nobody can tell what step broke. What's a better report?
