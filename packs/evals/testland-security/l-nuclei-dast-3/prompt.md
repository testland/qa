---
description: Short prompt that should load nuclei-dast with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

ZAP takes hours on our app and misses known CVEs in our stack. Is there a faster template-based scanner?
