---
description: Should load fast-check-testing when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write property-based tests in TypeScript for a `mergeSortedArrays(a, b)` function: the result is sorted and has every element of both inputs.
