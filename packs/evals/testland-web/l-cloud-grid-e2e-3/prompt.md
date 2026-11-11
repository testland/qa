---
description: Short prompt that should load cloud-grid-e2e with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests need to run on real iPhones and old Safari, and our staging site is only on the internal network. How do we do that?
