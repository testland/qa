# Detox element API - matchers, actions, assertions

[dm]: https://wix.github.io/Detox/docs/api/matchers

Lookup reference for `element(...)` matchers, the actions callable on a matched
element, and the assertions `expect(...)` supports. Referenced from Step 3 of
the detox-testing skill.

## Matchers

Per [detox-matchers][dm]:

| Matcher              | Use                                                |
|----------------------|----------------------------------------------------|
| `by.id('tap_me')`     | React Native `testID` prop (preferred default).    |
| `by.text('Tap Me')`   | Visible text content.                               |
| `by.label('...')`     | iOS accessibility label / Android content description. |
| `by.type('RCTImageView')` | Component class name (iOS / Android-specific). |
| `by.traits(['button'])` | iOS only - accessibility traits.                 |

Each accepts strings or regex (`by.id(/^tap_[a-z]+$/)`).

Combinators per [detox-matchers][dm]:

```javascript
withAncestor(matcher)    // child element within a parent
withDescendant(matcher)  // parent containing children
and(matcher)             // combine matchers
atIndex(index)           // when matcher returns multiple
```

## Actions

```javascript
await element(by.id('btn')).tap();
await element(by.id('btn')).longPress();
await element(by.id('btn')).multiTap(2);

await element(by.id('input')).typeText('hello');
await element(by.id('input')).clearText();
await element(by.id('input')).replaceText('new text');

await element(by.id('list')).scroll(200, 'down');
await element(by.id('list')).scrollTo('bottom');
await element(by.id('list')).swipe('left', 'fast');

await element(by.id('toggle')).pinch(1.5);
```

## Assertions

```javascript
await expect(element(by.id('toast'))).toBeVisible();
await expect(element(by.id('cart-count'))).toHaveText('1');
await expect(element(by.id('error'))).not.toBeVisible();
await expect(element(by.id('field'))).toHaveValue('expected');
```

`expect(...)` from Detox auto-waits up to a default timeout (typically 5s) - no
explicit `waitFor` needed for normal synchronization-tracked work.
