---
description: Short prompt that should load dependabot-config with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I configure Dependabot to group minor updates into one PR?
