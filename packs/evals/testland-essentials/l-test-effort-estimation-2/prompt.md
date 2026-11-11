---
description: Short prompt that should load test-effort-estimation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Estimate the test effort for this epic: new subscription plans (3 tiers), proration on upgrade, invoice PDF changes, and a migration of 40k existing customers.
