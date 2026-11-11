---
description: Short prompt that should delegate to the defect-pipeline-runner agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Do the weekly defect pipeline for the backlog: group bugs, Pareto by root cause and what to fix first.
