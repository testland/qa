---
description: Short prompt that should load slo-load-test-plan with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Plan the load tests for these SLOs: search p95 under 300 ms at 500 rps, checkout 99.9% success, product page p99 under 1 s.
