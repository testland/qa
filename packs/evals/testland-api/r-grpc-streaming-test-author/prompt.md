---
description: Should load grpc-streaming-test-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write tests in Go for a bidirectional gRPC streaming chat service: message ordering, client cancellation and deadline exceeded.
