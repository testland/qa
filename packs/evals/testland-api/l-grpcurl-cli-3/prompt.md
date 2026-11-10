---
description: Short prompt that should load grpcurl-cli with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

grpcurl says 'server does not support the reflection API'. How do I call the service anyway?
