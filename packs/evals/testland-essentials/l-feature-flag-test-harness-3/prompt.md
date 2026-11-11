---
description: Short prompt that should load feature-flag-test-harness with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A feature worked with its flag on but broke for everyone with it off, and our tests only ran one way. How do we prevent that?
