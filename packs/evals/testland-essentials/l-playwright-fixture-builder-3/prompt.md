---
description: Short prompt that should load playwright-fixture-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Playwright tests create the same test user in every file and they collide when workers run in parallel. How should setup work?
