---
description: Should load wiremock-stubs when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write a Java integration-test setup that stubs a slow, rate-limited third-party payments API (`POST /v1/charges`) so the tests run offline, including a timeout case and a 500 response.
