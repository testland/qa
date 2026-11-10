---
description: Short prompt that should load grpc-streaming-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this server-streaming method.

```proto
service Prices { rpc Watch(WatchRequest) returns (stream PriceUpdate); }
```
