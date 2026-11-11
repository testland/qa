---
description: Short prompt that should load flake-dashboard-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Build a Grafana panel for flake rate from our CI data. We store one row per test run: test_name, commit, attempt, status, started_at.
