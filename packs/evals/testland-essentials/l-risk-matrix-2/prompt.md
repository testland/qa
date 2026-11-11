---
description: Short prompt that should load risk-matrix with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Score these risks for our payments release and tell me what to test first: card decline handling, currency rounding, webhook retries, new admin refund screen, 3DS redirect on Safari.
