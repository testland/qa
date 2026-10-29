---
description: Should load js-unit-tests when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write Jest unit tests for a TypeScript `debounce(fn, ms)` utility, including timing behaviour.
