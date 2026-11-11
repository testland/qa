---
description: Short prompt that should load dependabot-config with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Dependabot opens 40 PRs a week and nobody merges them. How do we tame it?
