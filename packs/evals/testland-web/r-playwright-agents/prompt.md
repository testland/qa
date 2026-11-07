---
description: Should load playwright-agents when the whole pack is installed (healer diff review).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The Playwright healer agent rewrote three of our checkout tests overnight and now everything passes. What should I check before merging its changes?
