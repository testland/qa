---
description: Should load keycloak-tests when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Our app uses a self-hosted Keycloak for login. Set up integration tests that start Keycloak with our realm export and check the client-credentials flow.
