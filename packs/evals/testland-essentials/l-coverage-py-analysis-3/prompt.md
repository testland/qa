---
description: Short prompt that should load coverage-py-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our coverage report shows 30% even though we have lots of tests, ever since we started running pytest in parallel. Why?
