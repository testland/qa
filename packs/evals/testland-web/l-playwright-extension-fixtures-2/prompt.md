---
description: Short prompt that should load playwright-extension-fixtures with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Playwright test that opens this extension's popup.

```json
{ "manifest_version": 3, "name": "Notes", "action": { "default_popup": "popup.html" }, "background": { "service_worker": "sw.js" } }
```
