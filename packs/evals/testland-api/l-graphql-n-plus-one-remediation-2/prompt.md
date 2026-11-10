---
description: Short prompt that should load graphql-n-plus-one-remediation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This resolver is slow. Fix it.

```js
const resolvers = { Post: { author: (post) => db.users.findById(post.authorId) } };
```
