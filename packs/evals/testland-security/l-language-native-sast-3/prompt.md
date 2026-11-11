---
description: Short prompt that should load language-native-sast with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our JavaScript app had an XSS through innerHTML that code review missed. What linter would have caught it?
