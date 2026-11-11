---
description: Short prompt that should delegate to the release-quality-report-agent agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Build a manager-facing release quality report for this release from our test results and coverage diff.
