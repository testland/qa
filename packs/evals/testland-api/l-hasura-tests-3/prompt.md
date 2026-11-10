---
description: Short prompt that should load hasura-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A user could see another user's orders through our Hasura API. How do we test row permissions for every role?
