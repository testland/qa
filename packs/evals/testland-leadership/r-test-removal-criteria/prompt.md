---
description: Should load test-removal-criteria when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The suite has 9,000 tests and takes 50 minutes. Decide which tests can safely be deleted and what evidence to collect first.
