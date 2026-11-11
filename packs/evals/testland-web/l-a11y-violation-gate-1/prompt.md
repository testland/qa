---
description: Short prompt that should load a11y-violation-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I add an accessibility check to CI without failing every PR on the 300 issues we already have?
