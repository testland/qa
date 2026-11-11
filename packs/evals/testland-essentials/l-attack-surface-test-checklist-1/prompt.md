---
description: Short prompt that should load attack-surface-test-checklist with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Which security tests should I run for a PR that adds a file upload endpoint?
