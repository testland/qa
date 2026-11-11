---
description: Short prompt that should load web-push-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our server keeps sending pushes to subscriptions that return 410 Gone. How do we test that cleanup?
