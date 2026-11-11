---
description: Short prompt that should load lighthouse-perf with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Core Web Vitals in Search Console went red after a redesign and nothing in CI warned us. How do we catch it in PRs?
