---
description: Short prompt that should load hipaa-test-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our test fixtures contain real patient names copied from production. Is that a problem and how do we fix it?
