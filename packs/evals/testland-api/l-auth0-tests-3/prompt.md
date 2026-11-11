---
description: Short prompt that should load auth0-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Someone changed a setting in our Auth0 tenant by hand and login broke in staging. How do we catch config drift?
