---
description: Short prompt that should load playwright-snapshots with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

toHaveScreenshot passes on my Mac but fails in CI with a 2% pixel diff. What's going on?
