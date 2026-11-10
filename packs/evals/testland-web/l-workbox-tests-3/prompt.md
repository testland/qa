---
description: Short prompt that should load workbox-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After upgrading Workbox our image cache grows forever and old entries never expire. How do we catch that in tests?
