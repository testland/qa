---
description: Short prompt that should load ghz-load with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Load test this gRPC method at 500 requests per second.

```proto
service Orders { rpc GetOrder(GetOrderRequest) returns (Order); }
```
