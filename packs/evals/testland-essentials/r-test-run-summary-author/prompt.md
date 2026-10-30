---
description: Should load test-run-summary-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Last night's regression run had 1,240 tests: 17 failed (12 in checkout, 5 in search) and 9 were skipped. Write the short test-run summary the release manager will paste into Slack for the 2.8 release.
