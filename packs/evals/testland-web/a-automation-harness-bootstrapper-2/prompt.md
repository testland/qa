---
description: Short prompt that should delegate to the automation-harness-bootstrapper agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Scaffold an E2E test harness for our Vue app from scratch.
