---
description: Should load regression-suite-selector when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The full regression suite takes 2 hours on every pull request. Run only the tests affected by the changed files, with a nightly full run as a safety net.
