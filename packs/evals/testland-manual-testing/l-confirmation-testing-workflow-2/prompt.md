---
description: Short prompt that should load confirmation-testing-workflow with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

The developer says BUG-412 is fixed in commit a1b2c3d. QA is testing build 2026.11.10-rc2. How do I confirm the fix is in this build and works?
