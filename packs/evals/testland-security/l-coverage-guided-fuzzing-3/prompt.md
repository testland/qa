---
description: Short prompt that should load coverage-guided-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our image decoder crashed on a file a user uploaded and our unit tests never found it. How do we find crashes like that?
