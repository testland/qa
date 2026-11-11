---
description: Short prompt that should load kafka-consumer-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After a consumer group rebalance, some Kafka messages get processed twice. How do we test for that?
