---
description: Short prompt that should load lizard-complexity with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

One function in our codebase is 600 lines and nobody wants to review changes to it. How do we stop functions growing like that?
