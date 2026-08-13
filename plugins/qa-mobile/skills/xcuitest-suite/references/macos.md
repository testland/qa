# XCUITest on macOS desktop apps - the macOS delta

XCTest UI testing for macOS desktop apps (AppKit, SwiftUI, Catalyst) uses the
same three-class `XCUIApplication` / `XCUIElement` / `XCUIElementQuery` pattern,
the same accessibility-identifier locator strategy, and the same `XCTAssert*`
macros as the iOS workflow in [SKILL.md](../SKILL.md). Per Apple's
[*Testing with Xcode* - UI Testing chapter][appleuit], "UI Testing in Xcode
rests on two core technologies: the XCTest framework and Accessibility."
This reference covers only what differs on macOS.

[appleuit]: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html
[applewt]: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/04-writing_tests.html

## Destination flags

There is no simulator: `-destination` targets the host Mac directly.

```bash
# Run the full test bundle on the host Mac
xcodebuild test \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=macOS' \
  -resultBundlePath build/result.xcresult

# Run a single test class / method
xcodebuild test -project MyApp.xcodeproj -scheme MyApp \
  -destination 'platform=macOS' \
  -only-testing:MyAppUITests/CheckoutUITests/testCheckoutHappyPath
```

## Setting identifiers in macOS app code

```swift
// SwiftUI
Button("Sign In") { … }
    .accessibilityIdentifier("signInButton")

// AppKit
signInButton.setAccessibilityIdentifier("signInButton")
```

## TCC privacy permissions

macOS gates Automation, Accessibility, and Screen Recording behind TCC
(Transparency, Consent, and Control) consent prompts. The prompts are
out-of-process - an XCUITest cannot click through them. Reset consent state
before launch (per [Jamf's TCC reset guide][jamftcc]), or pre-grant via an MDM
PPPC (Privacy Preferences Policy Control) profile on managed CI fleets:

```bash
for s in Automation Accessibility ScreenCapture; do
  tccutil reset "$s" "$BUNDLE_ID" || true
done
```

[jamftcc]: https://docs.jamf.com/technical-articles/Resetting_Transparency_Consent_and_Control_Prompts_on_macOS.html

## CI on macOS runners

Hosted GitHub macOS runners are interactive sessions, so `XCUIApplication`
launches need no extra display setup. Self-hosted headless Macs need an
attached console or VNC session - XCTest UI cannot run under launchd alone.

```yaml
# .github/workflows/macos-xctest.yml
jobs:
  test:
    runs-on: macos-14   # Apple Silicon
    steps:
      - uses: actions/checkout@v5
      - uses: maxim-lobanov/setup-xcode@v1
        with: { xcode-version: '15.4' }
      - run: |
          xcodebuild test \
            -project MyApp.xcodeproj \
            -scheme MyApp \
            -destination 'platform=macOS' \
            -resultBundlePath build/result.xcresult \
            -enableCodeCoverage YES
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: xcresult
          path: build/result.xcresult
```

Result parsing is identical to iOS (Step 7 in [SKILL.md](../SKILL.md)):
`xcrun xcresulttool` for JSON summaries and attachments; the open-source
`xcresultparser` converts `.xcresult` to JUnit XML for `junit-xml-analysis`.

## macOS-specific gotchas

- **Performance baselines are per-device.** Per [applewt][applewt],
  performance tests fail until a baseline is set, and "baselines are stored
  per-device-configuration" - a baseline committed from an Intel Mac fails on
  Apple Silicon CI and vice versa. Commit baselines from the runner that gates.
- **Cross-process drag-and-drop** between two apps is only partially reachable
  via `XCUICoordinate`; complex multi-app flows often need Appium's Mac2
  driver instead.
- **Sandboxed App Store apps** restrict test-time file-system writes; observe
  in-process via `XCTestObservationCenter` rather than out-of-process file
  diffs.
- **GPU-rendered content** (Metal, CALayer-only views) publishes no
  accessibility children - opaque to any accessibility-tree driver.
- **Desktop driver landscape:** for the Windows (UI Automation) and Linux
  (AT-SPI) counterparts and the cross-OS locator strategy, see
  `desktop-test-strategy-reference` in the qa-desktop plugin.
