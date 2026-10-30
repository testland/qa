---
description: Should load lighthouse-perf when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Check Core Web Vitals on every pull request for a Next.js site and fail when LCP or CLS goes over budget.
