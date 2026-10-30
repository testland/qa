---
description: Should load language-native-sast when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add security linting to a Python repository: run Bandit in CI, keep a baseline for existing findings, and fail only on new high-severity issues.
