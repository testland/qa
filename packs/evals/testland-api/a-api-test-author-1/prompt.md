---
description: Short prompt that should delegate to the api-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write an API test for this behavior: POST /orders with an expired coupon returns 422 and the error code COUPON_EXPIRED.
