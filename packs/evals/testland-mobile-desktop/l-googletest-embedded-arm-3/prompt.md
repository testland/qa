---
description: Short prompt that should load googletest-embedded-arm with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our C++ firmware tests pass on the host but the same code fails on the Cortex-M target. How do we run them closer to the device?
