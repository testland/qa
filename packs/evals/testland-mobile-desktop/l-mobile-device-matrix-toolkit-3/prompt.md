---
description: Short prompt that should load mobile-device-matrix-toolkit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Running our mobile tests on 30 real devices for every PR costs too much. How do we cut it without missing bugs?
