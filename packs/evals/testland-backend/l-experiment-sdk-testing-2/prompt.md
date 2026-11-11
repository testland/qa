---
description: Short prompt that should load experiment-sdk-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for both variants of this Optimizely experiment.

```ts
const user = client.createUserContext(userId);
const decision = user.decide('checkout_redesign');
return decision.variationKey === 'treatment' ? <NewCheckout /> : <OldCheckout />;
```
