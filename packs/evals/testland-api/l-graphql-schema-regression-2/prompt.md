---
description: Short prompt that should load graphql-schema-regression with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is this schema change safe?

```diff
 type User {
   id: ID!
-  email: String
+  email: String!
 }
```
