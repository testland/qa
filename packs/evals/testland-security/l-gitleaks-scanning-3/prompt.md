---
description: Short prompt that should load gitleaks-scanning with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Someone committed an AWS key last year and we only found out now. How do we stop new leaks without failing on the old ones?
