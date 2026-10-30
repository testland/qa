---
description: Should load playwright-extension-fixtures when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write Playwright tests for a Chrome extension: load the unpacked extension, open its popup and check that the content script changes the page.
