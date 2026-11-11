---
description: Short prompt that should load server-sent-events-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

When our event stream reconnects, clients miss the updates sent during the gap. How do we test that?
