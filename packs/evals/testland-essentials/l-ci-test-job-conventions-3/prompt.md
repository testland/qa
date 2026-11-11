---
description: Short prompt that should load ci-test-job-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our CI retries every failed test three times, so real bugs get hidden and builds take forever. What's a sane retry policy?
