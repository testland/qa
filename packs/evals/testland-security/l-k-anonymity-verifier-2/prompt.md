---
description: Short prompt that should load k-anonymity-verifier with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is this masked export safe to give the analytics team? Check k-anonymity on zip, birth year and gender.

| zip | birth_year | gender | diagnosis |
|---|---|---|---|
| 10115 | 1984 | F | flu |
| 10115 | 1984 | F | asthma |
| 10117 | 1990 | M | diabetes |
