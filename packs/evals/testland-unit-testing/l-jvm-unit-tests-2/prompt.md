---
description: Short prompt that should load jvm-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write unit tests for this Java method.

```java
public static boolean isLeapYear(int y) {
  return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
}
```
