---
description: Short prompt that should load playwright-extension-fixtures with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

I edit my extension's content script but the Playwright test still runs the old code. Why?
