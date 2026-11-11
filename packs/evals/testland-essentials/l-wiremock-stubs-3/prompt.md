---
description: Short prompt that should load wiremock-stubs with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Spring Boot integration tests call a partner's sandbox API, which is slow and rate-limits us. How do we test without it?
