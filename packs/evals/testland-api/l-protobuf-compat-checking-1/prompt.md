---
description: Short prompt that should load protobuf-compat-checking with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I make sure a .proto change won't break consumers?
