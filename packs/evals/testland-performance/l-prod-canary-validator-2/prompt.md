---
description: Short prompt that should load prod-canary-validator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Promote or roll back? Canary (5% traffic, 30 min): error rate 0.9%, p95 420 ms, checkout conversion 3.1%. Baseline: error rate 0.4%, p95 380 ms, conversion 3.3%.
