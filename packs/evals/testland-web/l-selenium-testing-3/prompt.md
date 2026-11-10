---
description: Short prompt that should load selenium-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Selenium Java tests fail with 'session not created: This version of ChromeDriver only supports Chrome version 120'. How do I stop that?
