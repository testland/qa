---
description: Short prompt that should load reachability-analyzer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Most of our Snyk findings are in packages that nothing in our code calls. How do we filter them out?
