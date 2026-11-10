---
description: Short prompt that should load go-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

`go test ./...` passes locally but fails randomly in CI with a data race. How do I track it down?
