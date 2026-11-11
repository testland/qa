---
description: Short prompt that should load protobuf-compat-checking with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A Kafka consumer crashed after we changed a protobuf message. How do we check compatibility before merging?
