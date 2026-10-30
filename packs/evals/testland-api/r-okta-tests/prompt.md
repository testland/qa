---
description: Should load okta-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write tests for an app that uses Okta for sign-in: an MFA policy must be enforced for admins, and SCIM provisioning must create users correctly.
