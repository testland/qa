---
description: Short prompt that should load exploratory-charter-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write exploratory charters for our new bulk-import feature: CSV upload up to 50k rows, column mapping, preview and error report.
