---
description: Should load test-management-sync when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Push automated test results from CI into TestRail automatically: map each test to a case ID and create one test run per build.
