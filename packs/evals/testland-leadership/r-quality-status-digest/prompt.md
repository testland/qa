---
description: Should load quality-status-digest when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write the weekly quality status for leadership from CI pass rates, escaped defects and the flaky-test quarantine list, with a red, amber or green per area.
