---
description: Short prompt that should load manual-test-script-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a UAT script for business users to sign off our new expense approval flow: submit an expense, manager approves or rejects, finance pays.
