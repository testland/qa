---
description: Short prompt that should load lcov-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Which files fail an 80% line gate in this LCOV?

```
SF:src/cart.c
LF:120
LH:110
end_of_record
SF:src/pay.c
LF:200
LH:120
end_of_record
```
