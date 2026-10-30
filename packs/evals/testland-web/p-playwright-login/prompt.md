---
description: Should load playwright-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write Playwright tests in TypeScript for a login page: a successful login, a wrong password and a locked account, running in Chromium, Firefox and WebKit.
