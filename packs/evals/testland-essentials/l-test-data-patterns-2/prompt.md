---
description: Short prompt that should load test-data-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests build users like this everywhere. Suggest a better pattern.

```java
User u = new User("Ann", "ann@x.io", true, false, null, Role.ADMIN, LocalDate.of(1990,1,1), "DE");
```
