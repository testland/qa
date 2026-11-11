---
description: Short prompt that should load unity-test-framework with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Unity tests only run when someone opens the Test Runner window. How do we run them in CI?
