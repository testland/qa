---
description: Short prompt that should load keycloak-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write an integration test that logs in to Keycloak with this realm.

```json
{ "realm": "shop", "clients": [{ "clientId": "web", "publicClient": true }], "users": [{ "username": "ann", "credentials": [{ "type": "password", "value": "pw" }] }] }
```
