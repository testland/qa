---
description: Short prompt that should load graphql-complexity-limit-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that proves this server rejects very deep queries.

```js
const server = new ApolloServer({ schema, validationRules: [depthLimit(7)] });
```
