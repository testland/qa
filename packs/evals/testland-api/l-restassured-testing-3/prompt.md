---
description: Short prompt that should load restassured-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Java API tests pass even when the endpoint returns an empty body. How do we make the checks stricter?
