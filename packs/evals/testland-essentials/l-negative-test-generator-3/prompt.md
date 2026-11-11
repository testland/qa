---
description: Short prompt that should load negative-test-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our API returns 500 whenever someone sends a field with the wrong type, and none of our tests caught it. How do we cover error paths?
