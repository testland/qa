---
description: Short prompt that should load toxiproxy-chaos with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Put Toxiproxy between our app and Redis in this compose file and add 500 ms latency.

```yaml
services:
  app: { build: ., environment: { REDIS_URL: redis://redis:6379 } }
  redis: { image: redis:7 }
```
