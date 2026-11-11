---
description: Short prompt that should load seed-data-curator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our E2E tests run against a copy of production data that changes every week, so tests break randomly. What should we use instead?
