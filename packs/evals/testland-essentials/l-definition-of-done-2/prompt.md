---
description: Short prompt that should load definition-of-done with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Check this PR against our Definition of Done: code reviewed, unit tests added, docs updated, feature flag off by default.

PR: 'Add CSV export'. Changes: export.py (+120), test_export.py (+40). No docs changed.
