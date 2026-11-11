---
description: Short prompt that should load ci-failure-triage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Every red CI build turns into an hour of debugging before someone notices it was the test environment. How do we classify failures quickly?
