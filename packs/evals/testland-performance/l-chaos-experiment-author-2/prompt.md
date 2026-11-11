---
description: Short prompt that should load chaos-experiment-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a chaos experiment for this: we believe checkout keeps working if the recommendations service adds 2 seconds of latency.
