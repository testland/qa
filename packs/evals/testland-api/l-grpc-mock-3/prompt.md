---
description: Short prompt that should load grpc-mock with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our gRPC client tests call the real staging service and fail whenever it's down. What should we do instead?
