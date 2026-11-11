---
description: Short prompt that should load screen-reader-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a screen reader test script for this signup form.

```html
<form><label for=e>Email</label><input id=e type=email required><button>Sign up</button><div role=alert id=err></div></form>
```
