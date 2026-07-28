---
name: mobile-a11y-test-author
description: "Authors native mobile accessibility tests covering iOS (Accessibility Inspector, XCUITest `performAccessibilityAudit()` introduced in iOS 17, VoiceOver label/trait/hint verification) and Android (Espresso `AccessibilityChecks.enable()`, Accessibility Scanner, TalkBack traversal, `contentDescription` labelling) with WCAG-aligned checks for element labels, 44pt/48dp touch targets, contrast ratios, and focus order. Use when an iOS or Android app needs automated and manual accessibility test coverage beyond what `xcuitest-suite` or `espresso-suite` provide."
metadata:
  keywords: "accessibility, a11y, VoiceOver, TalkBack, WCAG, iOS, Android, XCUITest, Espresso, screen reader"
---

# mobile-a11y-test-author

## Overview

Native mobile accessibility testing spans two complementary layers:

- **Automated audits** catch structural issues (missing labels, contrast failures,
  undersized tap targets) on every CI run.
- **Assistive-technology checks** (VoiceOver, TalkBack) verify what automation
  cannot observe: announcement order, gesture navigation, hint clarity.

This skill covers both layers on iOS and Android. Full per-platform detail lives in
[references/ios-audit.md](references/ios-audit.md) and
[references/android-checks.md](references/android-checks.md).

Nearest neighbors and differentiation:

- `xcuitest-suite` - general XCUITest UI automation; does not cover
  `performAccessibilityAudit`, VoiceOver traits, or touch-target checks.
- `espresso-suite` - general Espresso UI automation; does not wire
  `AccessibilityChecks`, Accessibility Scanner, or TalkBack workflows.

## When to use

- An iOS or Android app needs accessibility (a11y) test coverage.
- The team must verify WCAG-aligned requirements (labels, contrast, touch targets,
  focus order) on real or simulated devices.
- A screen-reader regression (VoiceOver, TalkBack) has been reported and needs a
  test that guards against recurrence.

---

## iOS - core audit

`performAccessibilityAudit()` (iOS 17+) audits the current view and fails the test
automatically if any issue is found - no explicit assertion needed ([wwdc23][wwdc23]).

```swift
import XCTest

final class HomeAccessibilityTests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = true   // report ALL issues per screen, not just the first
        XCUIApplication().launch()
    }

    func testHomeScreenAudit() throws {
        try XCUIApplication().performAccessibilityAudit()
    }
}
```

Scoped audits, false-positive suppression, audit-per-screen, VoiceOver
label/trait/hint checks, 44pt touch targets, and Accessibility Inspector are in
[references/ios-audit.md](references/ios-audit.md).

---

## Android - core checks

`AccessibilityChecks.enable()` fires the Accessibility Test Framework on every
Espresso `perform()` call; `setRunChecksFromRootView(true)` checks the whole
hierarchy, not just the interacted view ([atf][atf]). Requires the
`espresso-accessibility` dependency.

```kotlin
import androidx.test.espresso.accessibility.AccessibilityChecks

@RunWith(AndroidJUnit4::class)
class CheckoutAccessibilityTest {
    init {
        AccessibilityChecks.enable().setRunChecksFromRootView(true)
    }

    @Test
    fun applyPromoCode() {
        onView(withId(R.id.promo_field)).perform(typeText("WELCOME10"), closeSoftKeyboard())
        onView(withId(R.id.apply_button)).perform(click())
        // checks fire automatically on every perform()
    }
}
```

The dependency, suppression, 48dp touch targets, contrast thresholds,
`contentDescription` labelling, and the TalkBack manual workflow are in
[references/android-checks.md](references/android-checks.md).

---

## CI integration

### iOS (GitHub Actions)

```yaml
jobs:
  a11y-audit:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v5
      - run: |
          xcodebuild test \
            -project MyApp.xcodeproj \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
            -only-testing MyAppUITests/HomeAccessibilityTests \
            -resultBundlePath A11yResults.xcresult
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-xcresult
          path: A11yResults.xcresult
```

### Android (GitHub Actions)

```yaml
jobs:
  a11y-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: ./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.example.CheckoutAccessibilityTest
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-test-results
          path: app/build/outputs/androidTest-results
```

---

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `continueAfterFailure = false` in audit tests | Stops after the first issue; misses the rest on the same screen | Set `continueAfterFailure = true` for audit tests ([wwdc23][wwdc23]) |
| No suppression closure; globally ignoring an audit type | Hides all failures of that type, not just the known one | Suppress by both `auditType` and `element.label` ([references/ios-audit.md](references/ios-audit.md)) |
| Setting `accessibilityLabel` to the element type | "Submit button" - VoiceOver already announces "button" from traits | Set label to purpose only: "Submit order" ([uia][uia]) |
| `contentDescription` on every `Text` composable | Redundant; TalkBack reads text content automatically | Omit for plain text; set only for icon-only or image elements ([cd][cd]) |
| Running `AccessibilityChecks` without `setRunChecksFromRootView(true)` | Checks only the interacted view; off-screen violations pass | Enable root-view mode (Android core, above) ([atf][atf]) |
| Manual TalkBack only, no automated checks | Inconsistent; regressions slip in on refactors | Pair TalkBack manual review with `AccessibilityChecks` in CI |

---

## Limitations

- **`performAccessibilityAudit` requires iOS 17+.** For pre-17 targets write
  explicit `XCUIElement.label` and `frame` assertions (see
  [references/ios-audit.md](references/ios-audit.md)).
- **Automated audits do not replace assistive-technology testing.** The WWDC 2023
  session explicitly states they are not a substitute for testing with VoiceOver
  or Dynamic Type enabled ([wwdc23][wwdc23]).
- **`AccessibilityChecks` fires on `perform()` only.** Views that are visible but
  never interacted with in a given test are not checked unless
  `setRunChecksFromRootView(true)` is set.
- **Contrast checks require rendered colors.** Dynamic themes or custom draw
  code may produce contrast failures only at runtime; static analysis tools
  (Android Lint) cannot catch them.

---

## References

- [Perform accessibility audits for your app][wwdc23] - `performAccessibilityAudit()`, audit types, per-screen guidance, `continueAfterFailure = true` recommendation, suppression closure.
- [UIAccessibilityElement][uia] - `accessibilityLabel`, `accessibilityHint`, `accessibilityTraits`.
- [Espresso accessibility checking][atf] - `AccessibilityChecks.enable()`, `setRunChecksFromRootView(true)`, `setSuppressingResultMatcher()`, per-action firing.
- [Describe UI elements][cd] - `contentDescription`: purpose not visual detail, `null` for decorative, unique labels in lists.
- Platform detail: [references/ios-audit.md](references/ios-audit.md), [references/android-checks.md](references/android-checks.md).
- `xcuitest-suite`, `espresso-suite` - functional UI automation; not accessibility-focused.

[wwdc23]: https://developer.apple.com/videos/play/wwdc2023/10035
[uia]: https://developer.apple.com/documentation/uikit/uiaccessibilityelement
[atf]: https://developer.android.com/training/testing/espresso/accessibility-checking
[cd]: https://developer.android.com/guide/topics/ui/accessibility/apps#describe-ui-element
