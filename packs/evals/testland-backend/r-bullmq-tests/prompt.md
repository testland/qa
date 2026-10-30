---
description: Should load bullmq-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write tests for a TypeScript BullMQ worker that sends invoice emails: retries with exponential backoff and a failed-job case, against a real Redis.
