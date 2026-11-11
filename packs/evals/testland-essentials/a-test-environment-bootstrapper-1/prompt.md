---
description: Short prompt that should delegate to the test-environment-bootstrapper agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Bootstrap a full integration test environment for our new orders service: Postgres and Kafka in containers, migrations, a seed snapshot and feature flags in memory.
