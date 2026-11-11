---
description: Short prompt that should load llm-regression-suite-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Every time we tweak the prompt, some other case breaks and we only find out from users. How do we catch regressions?
