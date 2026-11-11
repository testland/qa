---
description: Short prompt that should load flaui-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our WinForms app tests in C# keep failing because the window isn't ready when the test clicks. How do we wait properly?
