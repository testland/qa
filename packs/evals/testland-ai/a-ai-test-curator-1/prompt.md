---
description: Short prompt that should delegate to the ai-test-curator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review these AI-generated tests.

```ts
import { calculateTax } from '../src/tax';
import { mockTaxService } from '../src/__helpers__/taxMocks';
test('calculates tax', () => {
  expect(calculateTax(100, 'DE')).toBeTruthy();
});
```
