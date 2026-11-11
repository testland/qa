---
description: Short prompt that should load ceedling-build-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want Unity tests with mocks for our firmware to run with one command in CI. How do we wire it up?
