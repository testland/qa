---
description: Short prompt that should delegate to the extension-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write a Playwright test for our Manifest V3 Chrome extension's popup: it should show the current tab's title.
