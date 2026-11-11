---
description: Short prompt that should load sonarqube-maintainability-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Set up a SonarCloud gate on new code: maintainability rating A, no new code smells over 30 minutes of debt, for this TypeScript project.
