---
description: Short prompt that should load lcov-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have coverage from Jest, coverage.py and gcov in one monorepo and need one gate for all of them. How?
