---
description: Short prompt that should load perf-budget-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Decide go or no-go from these results versus main.

- k6: p95 410 ms (main 380 ms), errors 0.2% (main 0.1%)
- Lighthouse home: LCP 2.6 s (main 2.1 s), CLS 0.05
- JMeter checkout: p99 1.9 s (main 1.2 s)
