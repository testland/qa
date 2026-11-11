---
description: Short prompt that should load grpcurl-cli with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Call this method on localhost:50051 with id 42.

```proto
service Users { rpc Get(GetRequest) returns (User); }
message GetRequest { string id = 1; }
```
