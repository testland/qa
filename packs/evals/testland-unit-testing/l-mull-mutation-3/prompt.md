---
description: Short prompt that should load mull-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our C++ unit tests have 95% coverage but we still ship bugs. How can we tell if the tests actually check anything?
