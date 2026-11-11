---
description: Short prompt that should load flaky-test-quarantine with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We skip flaky tests with `@skip` and they stay skipped forever. What's a better process?
