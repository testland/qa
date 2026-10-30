---
description: Should load auth0-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

An app logs users in with Auth0. Set up automated tests for the login flow and the Auth0 Actions, without touching the production tenant.
