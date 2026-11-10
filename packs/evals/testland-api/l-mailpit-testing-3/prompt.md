---
description: Short prompt that should load mailpit-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our signup emails went out with a broken link and no test caught it. How do we test email content?
