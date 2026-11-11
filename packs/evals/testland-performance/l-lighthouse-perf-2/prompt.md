---
description: Short prompt that should load lighthouse-perf with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Set performance budgets for these routes in Lighthouse CI: home page, product page and checkout, and fail the PR when LCP or CLS goes over Google's thresholds.
