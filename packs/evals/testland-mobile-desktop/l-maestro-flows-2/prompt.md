---
description: Short prompt that should load maestro-flows with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Maestro flow for this: open the app, tap 'Sign in', enter email and password, tap 'Continue', check that 'Welcome back' is visible.
