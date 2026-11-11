---
description: Short prompt that should load visual-baseline-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our classifier outputs this for a PR. Write the CI step that decides pass or fail.

```json
[{"story": "Button/Primary", "class": "regression"}, {"story": "Card/Default", "class": "intended", "approved_by": "author"}]
```
