---
description: Short prompt that should load contract-compatibility-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We broke a mobile client twice this month with API changes. How do we stop deploys that break consumers?
