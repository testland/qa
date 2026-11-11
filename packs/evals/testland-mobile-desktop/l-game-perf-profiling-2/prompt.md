---
description: Short prompt that should load game-perf-profiling with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add a performance regression test to our Unity CI for this scene: it must stay under 16.6 ms per frame on our min-spec PC.
