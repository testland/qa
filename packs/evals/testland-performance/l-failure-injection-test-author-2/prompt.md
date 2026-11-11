---
description: Short prompt that should load failure-injection-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test where the payment API returns half a JSON body after 3 seconds and the connection then resets. Our client should retry once and show an error.
