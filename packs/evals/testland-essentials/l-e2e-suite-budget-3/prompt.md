---
description: Short prompt that should load e2e-suite-budget with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our E2E suite takes 70 minutes in CI and half the failures are flaky. Where do we start cutting?
