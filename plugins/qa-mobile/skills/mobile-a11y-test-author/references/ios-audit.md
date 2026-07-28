# iOS accessibility test detail

Extends the core `performAccessibilityAudit()` example in
[../SKILL.md](../SKILL.md). The audit is available from iOS 17 and fails the test
automatically when it finds an issue, so no explicit assertion is needed
([wwdc23][wwdc23]).

## Scope the audit to specific categories

```swift
try app.performAccessibilityAudit(for: [.dynamicType, .contrast])
```

Pass an `XCUIAccessibilityAuditType` option set. Documented audit types include
`.dynamicType` and `.contrast`; passing no argument runs all available checks
([wwdc23][wwdc23]).

## Suppress known false positives

```swift
try app.performAccessibilityAudit(for: [.contrast]) { issue in
    // Ignore the decorative watermark label (no contrast fix planned)
    if let element = issue.element,
       element.label == "WatermarkLabel",
       issue.auditType == .contrast {
        return true   // suppress this issue
    }
    return false
}
```

The closure receives an `XCUIAccessibilityAuditIssue`; return `true` to suppress.
Narrow suppressions by both `auditType` and `element.label` so real regressions
still fail ([wwdc23][wwdc23]).

## Cover each screen

Each call inspects only the currently visible elements. Navigate to every distinct
screen and re-run the audit:

```swift
func testCheckoutFlowAudit() throws {
    let app = XCUIApplication()
    app.launch()
    try app.performAccessibilityAudit()          // Screen 1
    app.buttons["place-order-button"].tap()
    try app.performAccessibilityAudit()          // Screen 2
}
```

## VoiceOver label, trait, and hint checks

`accessibilityLabel` is the localized string VoiceOver reads to identify an
element, `accessibilityHint` describes the action result, and
`accessibilityTraits` communicates purpose - common values are `.button`, `.link`,
`.header`, `.image`, `.staticText`, `.adjustable` ([uia][uia]). Production code
sets them; XCUITest verifies via `XCUIElement.label`:

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

## Touch target size (44pt minimum)

The minimum control size on iOS and iPadOS is 44x44 pt ([hig][hig]). Assert via
`XCUIElement.frame`:

```swift
func testSubmitButtonTouchTarget() {
    let frame = XCUIApplication().buttons["Submit order"].frame
    XCTAssertGreaterThanOrEqual(frame.width,  44, "Touch target width below 44pt")
    XCTAssertGreaterThanOrEqual(frame.height, 44, "Touch target height below 44pt")
}
```

## Accessibility Inspector (manual complement)

Open it from Xcode menu > Open Developer Tool > Accessibility Inspector. It runs
the same checks as `performAccessibilityAudit()` interactively on real devices and
simulators - use it to diagnose an audit failure before writing a suppression
([wwdc23][wwdc23]).

## References

- [Perform accessibility audits for your app][wwdc23] - `performAccessibilityAudit()`, `XCUIAccessibilityAuditType`, per-screen guidance, `continueAfterFailure = true` recommendation, suppression closure.
- [UIAccessibilityElement][uia] - `accessibilityLabel`, `accessibilityHint`, `accessibilityTraits`.
- [Human Interface Guidelines: Accessibility][hig] - 44x44 pt minimum control size.

[wwdc23]: https://developer.apple.com/videos/play/wwdc2023/10035
[uia]: https://developer.apple.com/documentation/uikit/uiaccessibilityelement
[hig]: https://developer.apple.com/design/human-interface-guidelines/accessibility
