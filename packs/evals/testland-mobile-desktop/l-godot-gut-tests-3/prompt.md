---
description: Short prompt that should load godot-gut-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want our Godot 4 tests to run headless in CI with JUnit output. How?
