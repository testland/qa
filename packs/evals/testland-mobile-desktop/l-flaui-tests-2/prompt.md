---
description: Short prompt that should load flaui-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a FlaUI test for this WPF window: a TextBox with AutomationId 'Amount', a Button 'Convert' and a TextBlock 'Result'.
