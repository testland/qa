---
description: Short prompt that should load bug-tracker-workflow with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Automate filing bugs from failing CI tests into GitHub Issues without creating duplicates for the same failure every night.
