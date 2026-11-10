---
description: Short prompt that should load storybook-visual-regression-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have 400 Storybook stories and designers keep finding visual breaks after merges. What's the cheapest way to test them all?
