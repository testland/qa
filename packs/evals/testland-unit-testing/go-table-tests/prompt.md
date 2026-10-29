---
description: Should load go-unit-tests when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write table-driven unit tests in Go for a `Slugify(s string) string` function.
