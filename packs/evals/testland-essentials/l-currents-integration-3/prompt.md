---
description: Short prompt that should load currents-integration with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We rerun Playwright tests until they pass and have no idea which tests are getting flakier over time. What tool helps?
