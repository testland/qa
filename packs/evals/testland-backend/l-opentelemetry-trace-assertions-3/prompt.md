---
description: Short prompt that should load opentelemetry-trace-assertions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our SLO alerts broke because a refactor renamed a span. How do we catch that in tests?
