---
description: Short prompt that should load testcontainers with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Replace this fixed sleep with a proper wait.

```java
@Container static GenericContainer<?> kafka = new GenericContainer<>("confluentinc/cp-kafka:7.6.0");
@BeforeAll static void waitForKafka() throws Exception { Thread.sleep(15000); }
```
