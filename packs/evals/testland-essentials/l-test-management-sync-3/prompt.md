---
description: Short prompt that should load test-management-sync with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

QA copies automated test results into TestRail by hand every release and it takes a day. Can we automate it?
