---
description: Should load a11y-violation-gate when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A web app has hundreds of existing accessibility violations. Add a CI check that fails a pull request only if it introduces new ones.
