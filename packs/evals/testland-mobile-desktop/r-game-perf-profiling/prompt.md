---
description: Should load game-perf-profiling when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A Unity game must hold 60 fps on console before certification. Set up profiling and a CI check that fails when frame time regresses.
