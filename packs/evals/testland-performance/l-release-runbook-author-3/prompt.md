---
description: Short prompt that should load release-runbook-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our releases depend on one engineer who knows the steps, and it went wrong when they were on holiday. How do we write it down properly?
