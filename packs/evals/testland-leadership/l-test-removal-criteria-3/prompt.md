---
description: Short prompt that should load test-removal-criteria with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our suite has 8,000 tests and we suspect a third are useless, but nobody dares delete any. How do we decide?
