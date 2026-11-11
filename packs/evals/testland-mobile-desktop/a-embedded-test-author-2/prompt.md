---
description: Short prompt that should delegate to the embedded-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Author GoogleTest tests for our embedded C++ sensor driver and run them on QEMU.
