---
description: Held-out short prompt that should load bug-tracker-workflow with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

How do we stop the same bug being filed three times in Jira?
