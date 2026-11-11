---
description: Held-out short prompt that should load bug-report-template with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

Is this bug report good enough to file? 'Login broken. Please fix ASAP.'
