---
description: Short prompt that should load qt-test-framework with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a data-driven Qt Test for this function.

```cpp
QString formatSize(qint64 bytes); // 0 -> "0 B", 1536 -> "1.5 KB", 1048576 -> "1 MB"
```
