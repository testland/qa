---
description: Held-out short prompt that should load deepchecks-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

How do I check that the same customers don't appear in both my train and test sets?
