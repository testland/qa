---
description: Short prompt that should load soc2-evidence-collector with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Collect SOC 2 Type II evidence from our CI for change management. We use GitHub Actions, require PR reviews and deploy with Argo CD.
