---
description: Short prompt that should load attack-surface-test-checklist with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our pentest found an IDOR in a feature we shipped last month. How do we decide what to security test on each change so this doesn't happen again?
