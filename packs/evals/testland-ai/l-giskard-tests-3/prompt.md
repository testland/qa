---
description: Short prompt that should load giskard-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our model changes its prediction when we add a trailing space to a text field. How do we test robustness like that?
