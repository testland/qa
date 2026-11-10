---
description: Short prompt that should load graphql-yoga-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Yoga server.

```ts
export const yoga = createYoga({ schema: createSchema({ typeDefs: `type Query { hello(name: String): String }`, resolvers: { Query: { hello: (_, { name }) => `Hello ${name ?? 'world'}` } } }) });
```
