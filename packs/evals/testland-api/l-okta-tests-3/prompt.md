---
description: Short prompt that should load okta-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Someone turned off MFA for admins in our Okta org and nobody noticed for a month. How do we test that config?
