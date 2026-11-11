---
description: Short prompt that should load desktop-test-strategy-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have a WPF app, a Qt app on Linux and an Electron app on macOS. Which test driver fits each?
