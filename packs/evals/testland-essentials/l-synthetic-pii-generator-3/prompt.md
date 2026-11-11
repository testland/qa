---
description: Short prompt that should load synthetic-pii-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our staging environment uses a copy of production with real customer emails, and someone accidentally emailed them. How do we replace that data?
