---
description: Short prompt that should load a11y-violation-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Every PR is red because of old accessibility errors, so people just ignore the a11y job. What should we do?
