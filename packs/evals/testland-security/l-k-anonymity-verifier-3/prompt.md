---
description: Short prompt that should load k-anonymity-verifier with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We removed names from our dataset but someone re-identified a person from zip code and birth date. How do we test masking strength?
