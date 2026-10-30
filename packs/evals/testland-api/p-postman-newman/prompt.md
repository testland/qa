---
description: Should load postman-collections when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Run a Postman collection of 60 API requests in GitHub Actions with Newman against the staging environment and publish a JUnit report.
