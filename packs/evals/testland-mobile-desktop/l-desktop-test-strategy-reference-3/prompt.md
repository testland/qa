---
description: Short prompt that should load desktop-test-strategy-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our desktop UI tests break every time the window layout changes because they click by coordinates. What should we do instead?
