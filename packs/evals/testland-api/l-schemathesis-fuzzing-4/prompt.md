---
description: Short prompt that should load schemathesis-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is there a tool that throws random valid requests at every endpoint in my Swagger file?
