---
description: Short prompt that should load e2e-suite-budget with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Here are our E2E stats for the last 90 days. Which tests should we retire or move down a layer?

| test | runtime | flake rate | bugs caught |
|---|---|---|---|
| checkout_full | 6m | 8% | 3 |
| profile_avatar | 2m | 15% | 0 |
| search_filters | 4m | 2% | 1 |
| admin_export | 5m | 0% | 0 |
