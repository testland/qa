---
description: Short prompt that should load i18n-string-coverage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I find strings in our React app that aren't translated?
