---
description: Short prompt that should load defect-escape-taxonomy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We keep doing post-mortems on escaped bugs but the action items are always 'add more tests'. How do we find the real gap?
