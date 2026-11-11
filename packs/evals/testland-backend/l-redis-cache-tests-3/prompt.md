---
description: Short prompt that should load redis-cache-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

When our cache expires, hundreds of requests hit the database at once and it falls over. How do we test for that?
