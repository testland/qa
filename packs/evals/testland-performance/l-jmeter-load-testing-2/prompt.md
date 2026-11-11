---
description: Short prompt that should load jmeter-load-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Convert this into a JMeter plan: 100 users ramp up over 60 seconds, each logs in, searches and checks out, and the test fails if more than 1% of requests error.
