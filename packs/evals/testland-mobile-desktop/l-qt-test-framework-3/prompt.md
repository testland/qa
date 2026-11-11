---
description: Short prompt that should load qt-test-framework with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We need to check that our Qt widget emits a signal when a button is clicked. How do we test that?
