---
description: Short prompt that should load locale-format-validator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

French customers see 1,234.56 € instead of 1 234,56 €. How do we test number formats per locale?
