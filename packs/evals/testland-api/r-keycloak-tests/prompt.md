---
description: Should load keycloak-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write Java integration tests that start a throwaway Keycloak with a realm export and check the client-credentials token flow and the admin REST API.
