---
description: Short prompt that should load jmeter-load-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our JMeter run in Jenkins produces a huge JTL file and nobody knows if the test passed. How do we gate on it?
