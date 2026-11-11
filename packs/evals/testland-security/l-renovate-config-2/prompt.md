---
description: Short prompt that should load renovate-config with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Fix this renovate.json so it only opens PRs on weekends and groups all eslint packages.

```json
{ "extends": ["config:base"] }
```
