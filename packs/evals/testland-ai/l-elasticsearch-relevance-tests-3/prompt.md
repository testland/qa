---
description: Short prompt that should load elasticsearch-relevance-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We added synonyms to our search and now 'iphone case' returns phones. How do we catch relevance regressions?
