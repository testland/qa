---
description: Short prompt that should load bats-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our deploy.sh broke production twice because of a bad flag. How can we test it before merging?
