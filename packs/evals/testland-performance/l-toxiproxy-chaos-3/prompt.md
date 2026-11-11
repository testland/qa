---
description: Short prompt that should load toxiproxy-chaos with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our service hangs forever when the database connection drops mid-query. How do we test that locally?
