---
description: Short prompt that should load sonarqube-maintainability-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

SonarQube shows a technical debt of 140 days on our project and nobody knows what to do with that number. How do we make it actionable?
