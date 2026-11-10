---
description: Short prompt that should load gherkin-from-stories with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Here are our manual test steps for password reset. Convert them into .feature files.

1. Click 'Forgot password'
2. Enter registered email
3. Receive link valid for 30 minutes
4. Set a new password that is not one of the last 3
