---
description: Short prompt that should load rabbitmq-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Messages in our RabbitMQ queue disappear when the consumer crashes mid-processing. How do we test that they're not lost?
