---
description: Short prompt that should load api-chaos-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Run our existing API tests with 2s of added latency to the payments service.

```yaml
services:
  payments:
    image: acme/payments
    ports: ["8080:8080"]
```
