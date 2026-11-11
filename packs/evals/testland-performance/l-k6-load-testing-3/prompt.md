---
description: Short prompt that should load k6-load-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our k6 test passes its p95 threshold but users still say the site is slow under load. What are we missing?
