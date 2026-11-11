---
description: Short prompt that should load db-query-plan-analyzer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our load test shows the API is fine until 200 users, then response times explode and the database CPU hits 100%. Where do we start?
