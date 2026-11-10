---
description: Short prompt that should load living-documentation-publisher with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Generate an HTML report from our Cucumber JSON output and publish it from CI.
