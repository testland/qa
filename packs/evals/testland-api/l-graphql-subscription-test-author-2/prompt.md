---
description: Short prompt that should load graphql-subscription-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this subscription.

```graphql
type Subscription { messageAdded(roomId: ID!): Message! }
```
