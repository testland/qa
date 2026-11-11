---
description: Short prompt that should load i18n-string-coverage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Which strings in this component are missing from translation?

```jsx
export function Cart({ count }) {
  return <div><h2>{t('cart.title')}</h2><p>You have {count} items</p><button>Checkout</button></div>;
}
```
