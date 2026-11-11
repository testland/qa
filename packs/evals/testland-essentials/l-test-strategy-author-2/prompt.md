---
description: Short prompt that should load test-strategy-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test strategy for a new mobile banking app: iOS and Android, a REST API, card freezing, transfers between own accounts, and a release in 10 weeks.
