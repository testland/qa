---
description: Short prompt that should load otel-collector-config-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We added a processor to our OTel Collector and traces silently stopped arriving. How do we test config changes?
