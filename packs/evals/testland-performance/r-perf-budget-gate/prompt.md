---
description: Should load perf-budget-gate when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Combine k6 load-test results and Lighthouse CI scores into one deploy gate that blocks a release when performance regresses against main.
