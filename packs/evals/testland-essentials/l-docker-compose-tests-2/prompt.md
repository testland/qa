---
description: Short prompt that should load docker-compose-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a compose file for tests of this app so CI waits until the services are ready.

```yaml
services:
  app: { build: ., depends_on: [db, redis] }
  db: { image: postgres:16 }
  redis: { image: redis:7 }
```
