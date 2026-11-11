---
description: Short prompt that should load knip-dead-code with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We deleted the old reports feature. Find what's left over in this project.

```json
{ "dependencies": { "chart.js": "^4", "date-fns": "^3", "lodash": "^4", "papaparse": "^5" } }
```
