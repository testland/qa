---
description: Short prompt that should load zap-baseline with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our ZAP scan only finds the login page because everything else needs a session. How do we scan behind login?
