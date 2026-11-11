---
description: Short prompt that should delegate to the bug-report-from-recording agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Here's a Playwright trace.zip and HAR from a failed checkout. Turn them into a bug report.
