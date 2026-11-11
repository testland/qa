---
description: Short prompt that should load event-sourcing-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We renamed an event field and now replaying old events crashes our read model. How do we test that?
