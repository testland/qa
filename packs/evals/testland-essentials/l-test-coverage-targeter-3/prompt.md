---
description: Short prompt that should load test-coverage-targeter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our coverage number looks fine but bugs keep coming from the same two modules. How do we target tests better?
