---
description: Short prompt that should load presidio-pii-detection with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our support tickets end up in the data lake with customer phone numbers and IBANs. How do we scan and scrub them?
