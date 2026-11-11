---
description: Held-out short prompt that should load experiment-results-interpreter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

Our experiment shows a 3% lift with p = 0.04 after four days. Can we stop it and ship?
