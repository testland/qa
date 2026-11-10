---
description: Short prompt that should load bdd-step-library-curator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have 300 Cucumber step definitions and many look like duplicates. How do we clean them up?
