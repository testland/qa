---
description: Should load mailpit-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Our signup sends a confirmation email over SMTP. Write tests that capture the email in a local mail catcher and check the confirmation link.
