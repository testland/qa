---
description: Short prompt that should load error-budget-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Check this error budget math and write a test for the alert: SLO 99.9% over 30 days, 1-hour burn rate alert at 14.4x.
