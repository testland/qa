---
description: Short prompt that should load pdf-accessibility-checker with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add a CI step that fails if any PDF in ./out is untagged or missing a title.

```bash
ls out/*.pdf
invoice-1042.pdf  contract-7.pdf
```
