---
description: Short prompt that should delegate to the e2e-flake-bisector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

This Playwright test fails about 1 in 10 runs and only in CI. Run it under different conditions and find which one makes it flaky: `tests/checkout.spec.ts:42`.
