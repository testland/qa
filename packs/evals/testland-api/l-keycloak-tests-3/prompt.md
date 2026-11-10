---
description: Short prompt that should load keycloak-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests share one Keycloak server and keep breaking each other's users. What's a better setup?
