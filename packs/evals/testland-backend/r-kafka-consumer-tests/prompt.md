---
description: Should load kafka-consumer-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write integration tests for a Spring Kafka consumer: a real broker in the test, offset commits, and a message that should land on the dead-letter topic.
