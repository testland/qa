---
description: Short prompt that should load test-case-anatomy-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Review these test cases for quality.

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC1 | Login | Log in | Works |
| TC2 | Reset password | Click 'Forgot password', enter email, open link | Password form shown |
