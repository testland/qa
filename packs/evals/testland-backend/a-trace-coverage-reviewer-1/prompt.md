---
description: Short prompt that should delegate to the trace-coverage-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review our OpenTelemetry instrumentation for this service and list the critical paths with no spans: DB queries, outbound HTTP calls, Kafka publishes and the nightly cron job.
