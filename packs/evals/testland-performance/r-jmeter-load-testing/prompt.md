---
description: Should load jmeter-load-testing when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write a JMeter test plan for a login and search flow with 200 users, run it headless in CI and fail if the 95th percentile exceeds 800 ms.
