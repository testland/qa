---
description: Short prompt that should load postman-collections with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our nightly Newman run gets rate-limited by a partner API. How do we slow it down?
