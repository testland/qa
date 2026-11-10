---
description: Short prompt that should load websocket-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our chat clients don't reconnect after the server restarts. How do we test that?
