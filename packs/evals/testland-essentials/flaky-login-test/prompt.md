---
description: Should load flaky-test-quarantine when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Our `test_login_redirect` test fails about one run in ten on CI and blocks merges. Nobody has time to fix it this week. What should we do with it right now so the pipeline stops going red without losing the signal?
