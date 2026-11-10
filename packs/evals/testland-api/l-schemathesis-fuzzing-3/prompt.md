---
description: Short prompt that should load schemathesis-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our API returns 500 on weird inputs that our hand-written tests never try. How do we find them automatically?
