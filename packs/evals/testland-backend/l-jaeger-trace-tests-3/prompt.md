---
description: Short prompt that should load jaeger-trace-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After a refactor our traces stopped showing the payments service, and nobody noticed for weeks. How do we test traces end to end?
