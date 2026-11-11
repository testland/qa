---
description: Short prompt that should load tcm-case-management with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Import these test cases into Xray from CSV and link them to their Jira stories.

```csv
Title,Steps,Expected,Story
Login with valid email,Enter email and password,Dashboard shown,SHOP-101
Login locked after 5 tries,Enter wrong password 5 times,Account locked,SHOP-102
```
