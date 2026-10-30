---
description: Should load lizard-complexity when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add a cyclomatic complexity gate to CI for a codebase in Python, Go and C++ that fails when a function goes over 15.
