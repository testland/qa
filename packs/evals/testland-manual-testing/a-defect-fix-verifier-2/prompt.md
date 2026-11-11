---
description: Short prompt that should delegate to the defect-fix-verifier agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

The developer says the login lockout bug is fixed. Confirm it's in the current build and actually works.
