---
description: Short prompt that should load sonarqube-rules with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

SonarQube fails every PR because of 3,000 old issues in legacy code. How do we only gate on new code?
