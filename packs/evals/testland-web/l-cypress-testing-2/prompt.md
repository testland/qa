---
description: Short prompt that should load cypress-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Fix this Cypress test.

```js
it('saves profile', () => {
  cy.visit('/profile');
  cy.get('#name').type('Ann');
  cy.get('.save').click();
  cy.wait(3000);
  cy.contains('Saved');
});
```
