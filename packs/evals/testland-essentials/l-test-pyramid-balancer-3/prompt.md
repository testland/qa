---
description: Short prompt that should load test-pyramid-balancer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Almost all our tests are UI tests and CI takes over an hour. How do we fix the shape of the suite?
