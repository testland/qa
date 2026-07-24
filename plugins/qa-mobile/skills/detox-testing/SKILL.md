---
name: detox-testing
description: "Authors React Native E2E tests using Detox (Wix) - uses gray-box architecture (test runs in-process with the app), `element(by.id|by.text|by.label)` matchers, `waitFor()` for explicit synchronization beyond Detox's automatic async tracking, and Jest as the default test runner. Use when the app is React Native and the team wants the fastest / most-reliable RN-specific framework."
---

# detox-testing

[det]: https://wix.github.io/Detox/

The "gray-box" distinction is load-bearing: unlike Appium (black-box,
external server), Detox runs **in the app's process** (per
[detox-docs][det]). This gives Detox direct access to the JS bridge
for **automatic synchronization**:

> "The framework automatically monitors asynchronous operations to
> eliminate test flakiness at its core." ([detox-docs][det])

Detox knows when network calls finish, when animations settle,
when timers fire - without explicit IdlingResource-style hooks.

## When to use

- The app is React Native (the framework's intended use case).
- Speed matters more than cross-stack reuse (Detox is faster than
  Appium for RN apps).
- The team uses Jest (Detox's default runner; built-in integration).

If the app is native iOS/Android (not RN), use
`xcuitest-suite` or
`espresso-suite`. For
non-RN-specific cross-platform, see
`appium-testing`.

## Step 1 - Install

```bash
npm install --save-dev detox
npx detox init   # scaffolds .detoxrc.js + e2e/ directory
```

`.detoxrc.js` configures device + app + runner; the default
template is sensible.

## Step 2 - Build the app for testing

```bash
# Android
detox build --configuration android.emu.debug

# iOS
detox build --configuration ios.sim.debug
```

The build configuration in `.detoxrc.js` references the project's
existing build commands (Gradle / xcodebuild) - Detox doesn't
introduce a new build pipeline.

## Step 3 - Author tests with matchers

Per [detox-matchers][dm]:

[dm]: https://wix.github.io/Detox/docs/api/matchers

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

Example test:

```javascript
describe('Cart flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('adds item to cart', async () => {
    await element(by.id('product-BOOK-001')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('1');
  });

  it('applies promo code', async () => {
    await element(by.id('promo-input')).typeText('WELCOME10');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('subtotal'))).toHaveText('$22.49');
  });
});
```

## Step 4 - Production code: set `testID`

In RN production code:

```jsx
<TouchableOpacity testID="add-to-cart-button" onPress={addToCart}>
  <Text>Add to cart</Text>
</TouchableOpacity>

<TextInput testID="promo-input" value={code} onChangeText={setCode} />
```

`testID` is React Native's prop for `accessibilityIdentifier`
(iOS) / `resource-id` (Android). Detox finds elements by it.

## Step 5 - Actions

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

## Step 6 - Assertions

```javascript
await expect(element(by.id('toast'))).toBeVisible();
await expect(element(by.id('cart-count'))).toHaveText('1');
await expect(element(by.id('error'))).not.toBeVisible();
await expect(element(by.id('field'))).toHaveValue('expected');
```

`expect(...)` from Detox auto-waits up to a default timeout
(typically 5s) - no explicit `waitFor` needed for normal
synchronization-tracked work.

## Step 7 - `waitFor` for explicit sync

When Detox's automatic tracking misses something:

```javascript
await waitFor(element(by.id('async-result')))
  .toBeVisible()
  .withTimeout(10000);

await waitFor(element(by.id('progress-bar')))
  .not.toBeVisible()
  .whileElement(by.id('list')).scroll(100, 'down');
```

`waitFor(...).withTimeout(N)` polls the condition for up to N ms.
`whileElement(...)` performs an action (scroll) while waiting - 
useful for "scroll until visible."

## Step 8 - Run

```bash
detox test --configuration android.emu.debug
detox test --configuration ios.sim.debug

# Specific test file
detox test e2e/cart.test.js --configuration ios.sim.debug

# Headless mode
detox test --headless
```

Per [detox-docs][det], Detox is "CI-Ready: Tests execute seamlessly
on continuous integration platforms like Travis CI, CircleCI, and
Jenkins."

## Step 9 - CI integration

```yaml
jobs:
  detox-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: |
            detox build --configuration android.emu.debug
            detox test --configuration android.emu.debug --headless

  detox-ios:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npx pod-install
      - run: |
          detox build --configuration ios.sim.debug
          detox test --configuration ios.sim.debug
```

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Querying by `by.text` for translatable strings                       | Translation breaks tests.                                                 | Use `by.id` (testID) for stable lookups (Step 3). |
| `await sleep(2000)` between actions                                   | Detox's auto-sync is the point; sleeps mask real flake.                  | `waitFor(...)` for genuine async; trust auto-sync otherwise. |
| Skipping `device.reloadReactNative()` between tests                   | State leaks; tests pollute each other.                                   | `beforeEach` reload (Step 3 example). |
| `by.type('RCTView')` (iOS-specific class)                              | Tests break on Android (different class name).                           | Use `by.id` (cross-platform) or platform-conditional code. |
| Per-test app reinstall                                                | Slow; Detox's reload is faster.                                           | `device.reloadReactNative()` over `device.launchApp()`. |
| Long-press without device wake                                        | Simulator may be in screensaver; tap misses.                              | `device.shake()` / `device.openURL()` to wake. |

## Limitations

- **React Native only.** Native non-RN apps need
  `xcuitest-suite` or
  `appium-testing`.
- **iOS support depends on RN version.** Per [detox-docs][det],
  some iOS features may have caveats per RN version.
- **Test runner choice.** Detox works with any runner; Jest is
  built-in. Mocha / Jasmine require additional config.
- **In-process gray-box trade-off.** Detox knows about the JS
  bridge; native iOS/Android crashes that don't surface to JS may
  be invisible until next interaction.

## References

- [det][det] - Detox overview: gray-box architecture, automatic
  async monitoring, JS test syntax, CI-ready, RN-specific.
- [dm][dm] - Detox matchers: `by.id`, `by.text`, `by.label`,
  `by.type`, `by.traits`, regex support, combinators.
- `xcuitest-suite`,
  `espresso-suite`,
  `appium-testing`,
  `maestro-flows` - alternatives.
