---
description: Short prompt that should load grpc-streaming-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our gRPC stream sometimes stops without an error when the client cancels. How do we test cancellation and deadlines?
