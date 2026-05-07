---
name: touch-gesture-tester
description: "Verifies touch-gesture handlers (tap, double-tap, long-press, swipe, pinch, rotate, pan) work as expected under both mobile-emulation (Playwright) and native (XCUITest / Espresso / Detox) — distinguishes \"mouse click handler also fires on tap\" from \"real touch event fired with correct properties.\" Use when the app has bespoke gesture handlers (custom carousels, sliders, drag-drop, pull-to-refresh) and the team needs targeted gesture verification beyond generic UI assertions."
rating: 22
d6: 3
archetype: S3
---

# touch-gesture-tester

## Overview

Touch gestures are not just clicks-on-mobile. A `tap` on a phone
fires a different event sequence than a `click` on a desktop
(touchstart → touchend → click vs mousedown → mouseup → click). A
component that listens only for `click` works for both; a component
that listens for `touchstart` / `gesturestart` / `pointerdown` may
have bugs that mouse-only tests miss.

This skill is **build-an-X**: build per-gesture verification tests
that exercise the actual touch event sequences.

## When to use

- The app has custom gesture handlers: carousels, sliders, swipe-
  to-delete, pull-to-refresh, drag-and-drop, multi-touch (pinch /
  rotate).
- A bug report says "works on desktop, fails on touch."
- Pre-release sweep needs gesture-specific coverage on mobile
  emulation + (optionally) device.

If the app uses only standard click handlers, this is overkill —
the standard E2E suite covers it.

## Step 1 — Map the app's gesture handlers

```javascript
// Inventory: grep production code for touch event listeners
// JS / RN / web:
grep -rn "touchstart\|touchmove\|touchend\|gesturestart\|pointerdown" src/

// React Native:
grep -rn "PanResponder\|onSwipe\|onLongPress\|GestureDetector" src/

// iOS Swift:
grep -rn "UITapGestureRecognizer\|UISwipeGestureRecognizer\|UILongPressGestureRecognizer\|UIPinchGestureRecognizer" .

// Android Kotlin:
grep -rn "GestureDetector\|onTouchEvent\|MotionEvent" .
```

The output is the test target list. Each handler needs at least
one gesture test.

## Step 2 — Per-gesture test patterns (Playwright + mobile project)

### Tap

```typescript
import { test, expect, devices } from '@playwright/test';

test.use(devices['iPhone 15']);

test('tap fires the handler (not just click)', async ({ page }) => {
  await page.goto('/');
  // Tap synthesizes touchstart + touchend + click (standard pattern)
  await page.getByRole('button', { name: 'Like' }).tap();
  await expect(page.getByText('Liked')).toBeVisible();
});
```

### Double-tap

```typescript
test('double-tap zooms image', async ({ page }) => {
  await page.goto('/photos/BOOK-001');
  const image = page.getByRole('img', { name: 'Cover' });

  // Two rapid taps
  await image.tap();
  await image.tap();   // within 500ms

  // Verify zoom state (e.g., transform style or class change)
  await expect(image).toHaveCSS('transform', /scale\(2/);
});
```

### Long-press

```typescript
test('long-press opens context menu', async ({ page }) => {
  await page.goto('/messages/M-001');
  const message = page.getByText('Hello');

  // Hold for 1000ms (Playwright tap doesn't have built-in long-press;
  // synthesize via touchscreen primitives)
  const box = await message.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

  // For real long-press, use lower-level API:
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [new Touch({ identifier: 0, target: el, clientX: 100, clientY: 100 })],
      bubbles: true, cancelable: true,
    }));
  }, '[data-testid="message"]');
  await page.waitForTimeout(1100);   // exceed long-press threshold

  await expect(page.getByRole('menu', { name: 'Message actions' })).toBeVisible();
});
```

### Swipe

```typescript
test('swipe-left reveals delete action', async ({ page }) => {
  await page.goto('/messages');
  const message = page.getByTestId('message-001');
  const box = await message.boundingBox();

  // Swipe from right to left
  await page.touchscreen.swipe(
    box.x + box.width - 10, box.y + box.height / 2,   // start (right edge)
    box.x + 10, box.y + box.height / 2,                // end (left edge)
    { steps: 10 }
  );

  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});
```

(Note: `page.touchscreen.swipe` API may not exist on all
Playwright versions; equivalent via `page.mouse.move` + `page.touchscreen.tap`
or evaluate-based touch event synthesis.)

### Pinch / zoom (multi-touch)

Multi-touch is hardest to emulate. Native testing is more reliable:

```swift
// XCUITest
let map = app.images["map"]
map.pinch(withScale: 2.0, velocity: 1.0)   // zoom in 2×
```

```kotlin
// Espresso doesn't ship pinch; use UIAutomator or third-party
val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
device.executeShellCommand("input ...")    // simulate pinch
```

For browser-based testing, multi-touch is generally not reliable —
defer to native tests for pinch/rotate features.

## Step 3 — Native gesture testing (XCUITest)

```swift
// XCUITest gesture catalog
app.buttons["btn"].tap()
app.buttons["btn"].doubleTap()
app.buttons["btn"].press(forDuration: 1.0)            // long-press
app.cells.element(boundBy: 0).swipeLeft()
app.cells.element(boundBy: 0).swipeRight()
app.cells.element(boundBy: 0).swipeUp()
app.cells.element(boundBy: 0).swipeDown()
app.images["map"].pinch(withScale: 2.0, velocity: 1.0)
app.images["map"].twoFingerTap()
app.images["map"].rotate(.pi/4, withVelocity: 1.0)
```

XCUITest's gesture API is the most complete — use for high-fidelity
gesture tests on iOS.

## Step 4 — Native gesture testing (Detox, RN)

```javascript
await element(by.id('msg-001')).swipe('left', 'fast');
await element(by.id('btn')).tap();
await element(by.id('btn')).longPress();
await element(by.id('btn')).multiTap(2);   // double-tap
await element(by.id('map')).pinch(2.0);    // zoom in 2×
```

Detox covers most common gestures; for less common ones, fall back
to UIAutomator (Android) / XCUITest (iOS) via custom matchers.

## Step 5 — Assertions per gesture class

Each gesture test should assert:

1. **The event fired.** A test instrument can listen for the
   handler being invoked.
2. **The state changed correctly.** DOM / view state reflects the
   gesture's intended outcome.
3. **The animation completed (if applicable).** `pumpAndSettle()`
   in Flutter, `waitForAnimations` in others.
4. **Other inputs still work.** A pinch shouldn't break tap.

```typescript
// Comprehensive gesture test
test('swipe-left + tap delete', async ({ page }) => {
  // 1. Swipe
  await swipeLeft(page, '[data-testid="msg-001"]');

  // 2. State changed
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

  // 3. Tap delete
  await page.getByRole('button', { name: 'Delete' }).tap();

  // 4. Final state
  await expect(page.getByTestId('msg-001')).not.toBeVisible();
});
```

## Step 6 — CI integration

```yaml
jobs:
  gesture-tests:
    strategy:
      matrix:
        project:
          - mobile-iphone-15
          - mobile-pixel-7
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test gestures.spec.ts --project=${{ matrix.project }}
```

For native tests, see per-platform CI in
[`xcuitest-suite`](../xcuitest-suite/SKILL.md) /
[`espresso-suite`](../espresso-suite/SKILL.md) /
[`detox-testing`](../detox-testing/SKILL.md).

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `.click()` instead of `.tap()` on mobile profiles                    | Doesn't fire touchstart/touchend; misses gesture handlers.                | `.tap()` (Step 2). |
| Multi-touch tests in browser emulation                               | Unreliable; pinch/rotate emulation is fragile.                           | Native tests for multi-touch (Step 3-4). |
| Long-press via `setTimeout` only                                     | Doesn't synthesize touch event sequence; handler may not fire.           | Lower-level touch event APIs (Step 2). |
| Only testing the happy gesture                                        | Cancel mid-gesture, fail mid-swipe scenarios uncovered.                  | Test cancel scenarios too (touchcancel, interrupted swipe). |
| Skipping animation wait                                               | Assertion fires before transition completes; flaky.                      | `waitForAnimations` / `pumpAndSettle` (Step 5). |
| One mega gesture test                                                 | Failure obscures which gesture broke.                                     | One test per gesture (Step 5 sample). |

## Limitations

- **Emulation fidelity.** Browser-based touch emulation differs
  from real touch hardware (no actual touch pressure, no real
  multi-touch ID tracking).
- **Animation timing.** Tests may pass on dev hardware and fail on
  slow CI runners; tune timeouts accordingly.
- **Native vs web parity.** A gesture handler in RN may behave
  differently from the same handler in a web app at the same
  viewport.
- **Per-platform gesture quirks.** iOS swipes have different
  thresholds than Android; per-platform expectations needed.

## References

- Playwright touchscreen API (in the Playwright docs at
  `playwright.dev/docs/api/class-touchscreen`).
- [`xcuitest-suite`](../xcuitest-suite/SKILL.md),
  [`detox-testing`](../detox-testing/SKILL.md),
  [`espresso-suite`](../espresso-suite/SKILL.md) — native
  alternatives with deeper gesture support.
- [`mobile-web-emulation-runner`](../mobile-web-emulation-runner/SKILL.md)
  — the mobile-profile config this skill builds gesture tests on.
