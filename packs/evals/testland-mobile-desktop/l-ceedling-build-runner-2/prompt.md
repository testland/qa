---
description: Short prompt that should load ceedling-build-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Ceedling build fails with this. What's wrong?

```
ERROR: Found no file 'mock_uart.h' in search paths.
#include "mock_uart.h" in test/test_protocol.c
```
