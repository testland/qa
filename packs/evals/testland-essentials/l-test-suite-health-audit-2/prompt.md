---
description: Short prompt that should load test-suite-health-audit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Here's our suite: 2,400 tests, 18% E2E, flake rate 6% on E2E and 0.5% on unit, CI 48 minutes, 300 tests skipped for over a year. Give me a health verdict.
