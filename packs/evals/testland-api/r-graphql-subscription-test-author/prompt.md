---
description: Should load graphql-subscription-test-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write tests for a GraphQL subscription `orderStatusChanged` served over graphql-ws: subscribe, trigger an update, assert the events arrive in order, and check that an unauthenticated connection is rejected.
