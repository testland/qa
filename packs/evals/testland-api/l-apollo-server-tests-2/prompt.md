---
description: Short prompt that should load apollo-server-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Apollo Server.

```ts
const server = new ApolloServer({ typeDefs: `type Query { me: User } type User { id: ID! name: String }`, resolvers: { Query: { me: (_, __, ctx) => ctx.user } } });
```
