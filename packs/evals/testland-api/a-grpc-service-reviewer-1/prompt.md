---
description: Short prompt that should delegate to the grpc-service-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this new gRPC service for test gaps.

```proto
service Payments {
  rpc Charge(ChargeRequest) returns (ChargeReply);
  rpc StreamRefunds(RefundQuery) returns (stream Refund);
}
```
