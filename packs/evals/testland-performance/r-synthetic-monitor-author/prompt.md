---
description: Should load synthetic-monitor-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Set up a synthetic check in Checkly that logs in and completes checkout every 5 minutes in production and alerts on failure.
