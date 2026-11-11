---
description: Short prompt that should load malicious-payload-bank with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our security scan says our URL preview feature might allow SSRF. What inputs should our tests try?
