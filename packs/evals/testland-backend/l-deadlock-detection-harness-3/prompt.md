---
description: Short prompt that should load deadlock-detection-harness with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Java service hangs in production every few days with no errors in the logs. How do we find out if it's a deadlock?
