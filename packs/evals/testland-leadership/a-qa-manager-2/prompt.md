---
description: Short prompt that should delegate to the qa-manager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Give me the weekly QA status: pass-rate trend, escaped defects and flake debt across our five teams.
