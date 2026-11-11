---
description: Short prompt that should load synthetic-pii-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Generate 20 fake German customers for a demo: name, email, phone, IBAN-style bank account, address and date of birth. None of it may belong to a real person.
