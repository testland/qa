---
description: Short prompt that should load chromatic-visual-regression-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Chromatic build exits with code 1 on every PR even when nothing changed visually. What does that mean?
