---
description: Short prompt that should load unity-test-framework-c with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write Unity tests for this function.

```c
uint16_t crc16(const uint8_t *data, size_t len);
```
