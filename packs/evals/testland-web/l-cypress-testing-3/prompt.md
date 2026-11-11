---
description: Short prompt that should load cypress-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Cypress tests pass locally but fail about one run in five in CI. Where should I look?
