---
description: Held-out short prompt that should load test-framework-architecture-audit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

Our test helpers have grown into a 3,000-line utils file. How do we judge the framework's structure?
