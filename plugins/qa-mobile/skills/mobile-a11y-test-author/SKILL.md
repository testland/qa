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
- **Assistive-technology checks** (VoiceOver, TalkBack) verify the user experience
  that automation cannot observe: announcement order, gesture navigation, hint
  clarity.

This skill covers both layers on iOS and Android.

Nearest neighbors and differentiation:

- [`xcuitest-suite`](../xcuitest-suite/SKILL.md) - general XCUITest UI automation;
  does not cover `performAccessibilityAudit`, VoiceOver traits, or touch-target checks.
- [`espresso-suite`](../espresso-suite/SKILL.md) - general Espresso UI automation;
  does not wire `AccessibilityChecks`, Accessibility Scanner, or TalkBack workflows.

## When to use

- An iOS or Android app needs accessibility (a11y) test coverage.
- The team must verify WCAG-aligned requirements (labels, contrast, touch targets,
  focus order) on real or simulated devices.
- A screen-reader regression (VoiceOver, TalkBack) has been reported and needs a
  test that guards against recurrence.

---

## iOS - automated audit with `performAccessibilityAudit`

Per the WWDC 2023 session "Perform accessibility audits for your app"
([developer.apple.com/videos/play/wwdc2023/10035][wwdc23]):

> "Calling performAccessibilityAudit on your XCUIApplication will audit the
> current view for accessibility issues just as the Inspector does. There's no
> need for assertions: if any issues are found, your test automatically fails."

Available from iOS 17. The test fails automatically if any audit issue is found
(no explicit assertions needed).

### Step 1 - Basic audit

```swift
import XCTest

final class HomeAccessibilityTests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = true   // report ALL issues, not just the first
        XCUIApplication().launch()
    }

    func testHomeScreenAudit() throws {
        try XCUIApplication().performAccessibilityAudit()
    }
}
```

`continueAfterFailure = true` is intentional here ([wwdc23][wwdc23]): the audit
may find multiple issues per screen; stopping at the first hides the rest.

### Step 2 - Scope the audit to specific categories

```swift
try app.performAccessibilityAudit(for: [.dynamicType, .contrast])
```

Pass an `XCUIAccessibilityAuditType` option set. Documented audit types include
`.dynamicType` and `.contrast` ([wwdc23][wwdc23]); passing no argument runs all
available checks.

### Step 3 - Suppress known false positives

```swift
try app.performAccessibilityAudit(for: [.contrast]) { issue in
    // Ignore contrast issue on the watermark label (decorative, no contrast fix planned)
    if let element = issue.element,
       element.label == "WatermarkLabel",
       issue.auditType == .contrast {
        return true   // suppress this issue
    }
    return false
}
```

The closure receives an `XCUIAccessibilityAuditIssue`. Return `true` to suppress.
Narrow suppressions by both `auditType` and `element.label` to avoid masking real
regressions ([wwdc23][wwdc23]).

### Step 4 - Cover each screen

Each `performAccessibilityAudit()` call inspects only the currently visible
elements. Navigate to each distinct screen and run the audit:

```swift
func testCheckoutFlowAudit() throws {
    let app = XCUIApplication()
    app.launch()
    // Screen 1
    try app.performAccessibilityAudit()
    app.buttons["place-order-button"].tap()
    // Screen 2
    try app.performAccessibilityAudit()
}
```

---

## iOS - VoiceOver label, trait, and hint checks

Per [UIAccessibilityElement][uia] (Apple Developer Documentation):

- `accessibilityLabel` - localized string read by VoiceOver to identify the element.
- `accessibilityHint` - additional context describing the action result.
- `accessibilityTraits` - communicates purpose/behavior; common values include
  `.button`, `.link`, `.header`, `.image`, `.staticText`, `.adjustable`.

Production code sets them; XCUITest verifies via `XCUIElement.label`:

```swift
// Production (UIKit)
let submitButton = UIButton()
submitButton.accessibilityLabel = "Submit order"
submitButton.accessibilityHint  = "Places your order and charges the saved card"
submitButton.accessibilityTraits = [.button]
```

```swift
// Test
func testSubmitButtonLabel() {
    let btn = XCUIApplication().buttons["Submit order"]
    XCTAssertTrue(btn.exists, "VoiceOver cannot find the Submit button")
    XCTAssertEqual(btn.label, "Submit order")
}
```

### Touch target size (iOS 44pt minimum)

Per [Human Interface Guidelines: Accessibility][hig], the minimum control size
on iOS and iPadOS is 44x44 pt.

Assert via `XCUIElement.frame`:

```swift
func testSubmitButtonTouchTarget() {
    let frame = XCUIApplication().buttons["Submit order"].frame
    XCTAssertGreaterThanOrEqual(frame.width,  44, "Touch target width below 44pt")
    XCTAssertGreaterThanOrEqual(frame.height, 44, "Touch target height below 44pt")
}
```

### Accessibility Inspector (manual complement)

Run Accessibility Inspector (Xcode: Xcode menu > Open Developer Tool > Accessibility
Inspector). It performs the same checks as `performAccessibilityAudit()` interactively,
and supports inspection of real devices and simulators. Use it to diagnose issues found
by the automated audit before writing a suppression ([wwdc23][wwdc23]).

---

## Android - automated audit with `AccessibilityChecks`

Per [developer.android.com/training/testing/espresso/accessibility-checking][atf]:

> "Checks run automatically when performing any view action defined in ViewActions.
> Each check includes the view on which the action is performed plus all descendant
> views."

### Step 1 - Add dependency

```gradle
// app/build.gradle
dependencies {
    androidTestImplementation 'androidx.test.espresso:espresso-accessibility:3.6.1'
}
```

### Step 2 - Enable checks

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
        // AccessibilityChecks fires automatically on every perform() call
    }
}
```

`setRunChecksFromRootView(true)` evaluates the whole hierarchy, not just the
interacted view ([atf][atf]).

### Step 3 - Suppress known issues

```kotlin
AccessibilityChecks.enable().apply {
    setSuppressingResultMatcher(
        allOf(
            matchesCheck(TextContrastCheck::class.java),
            matchesViews(withId(R.id.decorative_watermark))
        )
    )
}
```

The matcher must satisfy both the check type and the specific view ([atf][atf]).

### Touch target size (Android 48dp minimum)

Per [developer.android.com/guide/topics/ui/accessibility/apps#large-controls][atgt]:

> "For touch interfaces, we recommend that each interactive UI element have a
> focusable area, or touch target size, of at least 48dp x 48dp."

`AccessibilityChecks` validates this automatically on every `perform()` call.

### Contrast thresholds

Per [developer.android.com/guide/topics/ui/accessibility/apps#text-visibility][contrast]:

- Text smaller than 18sp, or bold text smaller than 14sp: minimum contrast ratio **4.5:1**.
- All other text: minimum contrast ratio **3:1**.

`AccessibilityChecks` (via the Accessibility Test Framework) checks these thresholds
on every `perform()` call.

---

## Android - `contentDescription` labelling

Per [developer.android.com/guide/topics/ui/accessibility/apps#describe-ui-element][cd]:

> "Convey purpose, not visual details."

```kotlin
// Icon-only button: set contentDescription
Icon(
    imageVector = Icons.Filled.Share,
    contentDescription = stringResource(R.string.label_share)
)

// Decorative image: suppress from accessibility
Icon(
    imageVector = Icons.Filled.Decoration,
    contentDescription = null   // TalkBack skips this element
)
```

Key rules ([cd][cd]):

- `Text` composables do not need `contentDescription`; TalkBack reads text content
  automatically.
- List items need distinct descriptions to prevent screen reader users from hearing
  the same label repeated.

Verify with Espresso:

```kotlin
onView(withId(R.id.share_button))
    .check(matches(withContentDescription(R.string.label_share)))
```

---

## Android - TalkBack manual workflow

Per [developer.android.com/guide/topics/ui/accessibility/testing][at]:

1. Enable: Settings > Accessibility > TalkBack > On.
2. Linear navigation: swipe right/left through elements in order; double-tap to
   activate.
3. Explore by touch: drag to hear elements under your finger.

Manual checklist:

- All interactive elements are reachable via swipe.
- Each element announces its purpose clearly and without redundancy.
- Alert messages are announced when they appear.
- Focus traversal order matches the visual reading order.

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
| No suppression closure; globally ignoring an audit type | Hides all failures of that type, not just the known one | Suppress by both `auditType` and `element.label` (Step 3, iOS) |
| Setting `accessibilityLabel` to the element type | "Submit button" - VoiceOver already announces "button" from traits | Set label to purpose only: "Submit order" ([uia][uia]) |
| `contentDescription` on every `Text` composable | Redundant; TalkBack reads text content automatically | Omit for plain text; set only for icon-only or image elements ([cd][cd]) |
| Running `AccessibilityChecks` without `setRunChecksFromRootView(true)` | Checks only the interacted view; off-screen violations pass | Enable root-view mode (Step 2, Android) ([atf][atf]) |
| Manual TalkBack only, no automated checks | Inconsistent; regressions slip in on refactors | Pair TalkBack manual review with `AccessibilityChecks` in CI |

---

## Limitations

- **`performAccessibilityAudit` requires iOS 17+.** For pre-17 targets write
  explicit `XCUIElement.label` and `frame` assertions (Steps in "VoiceOver label"
  section above).
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

- [wwdc23] https://developer.apple.com/videos/play/wwdc2023/10035 - "Perform accessibility audits for your app": `performAccessibilityAudit()`, `XCUIAccessibilityAuditType`, audit-per-screen guidance, `continueAfterFailure = true` recommendation, suppression closure pattern.
- [uia] https://developer.apple.com/documentation/uikit/uiaccessibilityelement - `accessibilityLabel`, `accessibilityHint`, `accessibilityTraits` (`.button`, `.link`, `.header`, `.image`).
- [hig] https://developer.apple.com/design/human-interface-guidelines/accessibility - minimum control size table: 44x44 pt on iOS and iPadOS.
- [atf] https://developer.android.com/training/testing/espresso/accessibility-checking - `AccessibilityChecks.enable()`, `setRunChecksFromRootView(true)`, `setSuppressingResultMatcher()`, per-action firing behavior.
- [atgt] https://developer.android.com/guide/topics/ui/accessibility/apps#large-controls - 48dp x 48dp minimum touch target requirement.
- [contrast] https://developer.android.com/guide/topics/ui/accessibility/apps#text-visibility - 4.5:1 contrast for text <18sp or bold <14sp; 3:1 for all other text.
- [cd] https://developer.android.com/guide/topics/ui/accessibility/apps#describe-ui-element - `contentDescription` guidance: purpose not visual detail, null for decorative elements, unique labels in lists.
- [at] https://developer.android.com/guide/topics/ui/accessibility/testing - TalkBack enable, linear navigation (swipe right/left), explore-by-touch, manual checklist.
- [`xcuitest-suite`](../xcuitest-suite/SKILL.md) - iOS UI automation (functional); not accessibility-focused.
- [`espresso-suite`](../espresso-suite/SKILL.md) - Android UI automation (functional); not accessibility-focused.

[wwdc23]: https://developer.apple.com/videos/play/wwdc2023/10035
[uia]: https://developer.apple.com/documentation/uikit/uiaccessibilityelement
[hig]: https://developer.apple.com/design/human-interface-guidelines/accessibility
[atf]: https://developer.android.com/training/testing/espresso/accessibility-checking
[atgt]: https://developer.android.com/guide/topics/ui/accessibility/apps#large-controls
[contrast]: https://developer.android.com/guide/topics/ui/accessibility/apps#text-visibility
[cd]: https://developer.android.com/guide/topics/ui/accessibility/apps#describe-ui-element
[at]: https://developer.android.com/guide/topics/ui/accessibility/testing
