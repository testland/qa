---
description: Short prompt that should load okta-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this Okta sign-on policy.

```json
{ "name": "Admins", "conditions": { "people": { "groups": { "include": ["admins"] } } }, "actions": { "signon": { "factorPromptMode": "ALWAYS" } } }
```
