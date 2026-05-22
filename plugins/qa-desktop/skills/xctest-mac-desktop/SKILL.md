---
name: xctest-mac-desktop
description: "Authors and runs XCTest UI + unit tests for macOS desktop apps — the Apple-first-party test framework that ships with Xcode. Covers the `XCTestCase` subclass + `test*` method-naming convention, `XCUIApplication` / `XCUIElement` / `XCUIElementQuery` for UI tests, accessibility-identifier-based locators (the stable replacement for label-based queries), `XCTAssert*` macros, `measureBlock:` for performance regressions, and `xcodebuild test` for CI execution. Use when the macOS app is built with Xcode and the test target is in-tree alongside the app — for cross-OS sharing see Appium Mac2 driver as a separate path."
archetype: S1
rating: 23
d6: 4
keywords:
  - xctest
  - macos
  - xcuiapplication
  - accessibility-identifier
  - xcodebuild
---

# xctest-mac-desktop

## Overview

XCTest is the **first-party test framework** bundled with Xcode. Per
Apple's [*Testing with Xcode* — UI Testing chapter][appleuit]:

[appleuit]: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/09-ui_testing.html

> "UI testing rests upon two core technologies: the XCTest framework
> and Accessibility."

This is the same framework used for unit tests and performance
tests — UI testing is layered on top via three classes
([appleuit][appleuit]):

> "UI Testing in Xcode rests on two core technologies: the XCTest
> framework and Accessibility … XCUIApplication … XCUIElement …
> XCUIElementQuery."

This skill wraps XCTest for **macOS desktop** apps. For iOS / iPadOS
the same APIs apply with different launch + simulator semantics —
that path is intentionally out of scope; this plugin covers desktop
only.

**Strategic frame:** see
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
for how macOS sits in the three-OS landscape (UIA on Windows, XCTest
on macOS, AT-SPI on Linux). The locator strategy across all three
backends converges on accessibility identifiers.

## When to use

- macOS desktop app built with Xcode (AppKit, SwiftUI, Catalyst) —
  XCTest is the default sanctioned path per
  [appleuit][appleuit].
- Tests need to run on the same macOS runner that builds the app
  (`xcodebuild test`).
- Mixed unit + UI + performance suites — one framework covers all
  three (Apple's [*Writing Tests* chapter][applewt] documents the
  shared `XCTestCase` base).

[applewt]: https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/chapters/04-writing_tests.html

## Step 1 — Create a UI test target

In Xcode: **File → New → Target → UI Testing Bundle**. The
generated test class inherits from `XCTestCase` and ships with a
boilerplate `setUp` that launches the app
([appleuit][appleuit]):

```swift
import XCTest

final class CheckoutUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false   // recommended by Apple — UI steps depend on prior steps
        XCUIApplication().launch()
    }

    func testCheckoutHappyPath() throws {
        // Test body — see Step 3
    }
}
```

Per [appleuit][appleuit]:

> "Set continueAfterFailure to NO ensures tests stop on first
> failure (recommended since UI test steps are dependent)."

## Step 2 — Test-method naming + lifecycle

Per [applewt][applewt], a test method must:

- "Begin with the prefix `test`"
- "Take no parameters"
- "Return `void`"

Lifecycle order ([applewt][applewt]):

1. Class setup (`+ (void)setUp`) — once before all tests.
2. Per test: `setUp` → test method → `tearDown`.
3. Class teardown (`+ (void)tearDown`) — once after all tests.

## Step 3 — Author UI tests with accessibility identifiers

The portable lesson per
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md):
prefer `accessibilityIdentifier` over visible labels. Set the
identifier in app code:

```swift
// In app code (SwiftUI)
Button("Sign In") { … }
    .accessibilityIdentifier("signInButton")

// Or in AppKit
signInButton.setAccessibilityIdentifier("signInButton")
```

Then in tests:

```swift
func testCheckoutHappyPath() throws {
    let app = XCUIApplication()
    app.launch()

    // Query → Interact → Assert (the canonical XCUI pattern per [appleuit])
    app.textFields["emailField"].tap()
    app.textFields["emailField"].typeText("user@example.com")

    app.secureTextFields["passwordField"].tap()
    app.secureTextFields["passwordField"].typeText("s3cret")

    app.buttons["signInButton"].tap()

    // Wait + assert
    let welcomeHeading = app.staticTexts["welcomeHeading"]
    XCTAssertTrue(welcomeHeading.waitForExistence(timeout: 5))
    XCTAssertEqual(welcomeHeading.label, "Welcome, user@example.com")
}
```

Per [appleuit][appleuit], the canonical pattern is:

> "Use an XCUIElementQuery to find an XCUIElement. Synthesize an
> event and send it to the XCUIElement. Use an assertion to compare
> the state of the XCUIElement against an expected reference state."

`waitForExistence(timeout:)` is the documented predicate-polling
primitive used in place of fixed sleeps (stable identifier in Apple's
XCUIElement reference; cited inline by name).

## Step 4 — Assertion macros

Per [applewt][applewt], XCTAssert macros fall into five categories:

| Category | Macros |
|---|---|
| Equality | `XCTAssertEqual`, `XCTAssertEqualObjects`, `XCTAssertNotEqual`, `XCTAssertGreaterThan`, `XCTAssertEqualWithAccuracy` |
| Boolean | `XCTAssertTrue`, `XCTAssertFalse` |
| Nil | `XCTAssertNil`, `XCTAssertNotNil` |
| Exception | `XCTAssertThrows`, `XCTAssertThrowsSpecific`, `XCTAssertNoThrow` |
| Unconditional fail | `XCTFail` |

All accept an optional format string for the failure message
([applewt][applewt]).

## Step 5 — Performance tests with measureBlock:

Per [applewt][applewt], performance tests "run a code block 10
times, collecting average execution time and standard deviation":

```swift
func testAdditionPerformance() throws {
    self.measure {
        var sum = 0
        for i in 0..<100_000 { sum += i }
        XCTAssertEqual(sum, 4_999_950_000)
    }
}
```

Per [applewt][applewt]: "Performance tests report failure on first
run until a baseline is set. Baselines are stored per-device-
configuration." Practical implication: the first CI run on a new
Mac architecture (Intel → Apple Silicon migration) fails until the
baseline is committed.

## Step 6 — Recording UI tests

Per [appleuit][appleuit], Xcode's "UI Recording" workflow generates
test code from interactive use:

1. Place the cursor in a test function.
2. Click the red "record" button in the editor.
3. The app launches automatically.
4. Exercise the app with the desired UI actions.
5. Stop recording — Xcode captures actions as source code.
6. Add `XCTAssert` assertions to validate behaviour.

Treat recordings as a **starting point** — the generated locator
chain tends to rely on label paths rather than
`accessibilityIdentifier`. Refactor to identifier-based queries (per
the [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
locator table) before checking in.

## Step 7 — Run

From the command line:

```bash
# Run the full test bundle
xcodebuild test \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=macOS' \
  -resultBundlePath build/result.xcresult

# Run a single test class
xcodebuild test \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=macOS' \
  -only-testing:MyAppUITests/CheckoutUITests

# Run a single test method
xcodebuild test \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=macOS' \
  -only-testing:MyAppUITests/CheckoutUITests/testCheckoutHappyPath
```

`-destination 'platform=macOS'` targets the host Mac. `-resultBundlePath`
writes a `.xcresult` bundle that contains attachments (screenshots
on failure, performance metrics, logs) — the canonical artefact for
post-mortem.

## Step 8 — Parsing results

The `.xcresult` bundle is queryable via `xcrun xcresulttool`:

```bash
# JSON summary of the result bundle
xcrun xcresulttool get --path build/result.xcresult --format json

# Extract a specific failure's screenshot attachment
xcrun xcresulttool get --path build/result.xcresult \
  --id <attachment-id> --output failure.png
```

For CI dashboards that expect JUnit XML, the open-source `xcresultparser`
project converts `.xcresult` → JUnit XML; pair downstream with
[`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).

## Step 9 — CI integration

```yaml
# .github/workflows/macos-xctest.yml
jobs:
  test:
    runs-on: macos-14   # Apple Silicon
    steps:
      - uses: actions/checkout@v5
      - uses: maxim-lobanov/setup-xcode@v1
        with: { xcode-version: '15.4' }
      - name: Build + test
        run: |
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

Hosted macOS runners on GitHub-hosted are interactive sessions —
XCUIApplication launches work without extra display setup. Self-
hosted Mac headless setups need an attached console or VNC session;
XCTest UI cannot run under launchd alone.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Querying by visible label (`app.buttons["Sign In"]`) | Localisation collapses the locator (Spanish, Japanese builds break) | `accessibilityIdentifier` per Step 3 (per [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)) |
| `XCUIApplication().launch()` inside every test method | Per-method app launch is slow + redundant | Launch in `setUp` ([appleuit][appleuit]) |
| `Thread.sleep(2.0)` between actions | Flaky on slow CI, slow on fast | `waitForExistence(timeout:)` predicate polling (Step 3) |
| `continueAfterFailure = true` for UI tests | First failure cascades into confusing follow-on failures | `continueAfterFailure = false` per [appleuit][appleuit] |
| Mixing UI + unit + performance in one test method | Result attribution is opaque | One method per behaviour; share setup via `setUp` ([applewt][applewt]) |
| Performance baseline committed from a developer Mac | Baselines are device-specific; CI runner is a different device | Commit baselines from the CI runner that will gate the PR ([applewt][applewt]) |
| Recording-and-keep workflow without identifier refactor | Generated label-path locators are brittle | Refactor recordings to `accessibilityIdentifier` (Step 6) |
| `XCUIApplication()` without `.launch()` | The query tree is empty; element lookups time out | Always `launch()` before any query ([appleuit][appleuit]) |

## Limitations

- **macOS-only.** Tests run only on macOS hosts; cross-OS suites
  pair with Windows / Linux drivers in this plugin (per the
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
  matrix).
- **Apple modern docs are Cloudflare-gated.** The canonical
  `developer.apple.com/documentation/xctest` SPA shell returns
  without body content via automated fetch; this skill cites
  Apple's stable `library/archive` testing-with-xcode chapter
  ([appleuit][appleuit], [applewt][applewt]) for prose and treats
  per-API surface (`XCUIApplication`, `XCUIElement`, `XCUIElementQuery`,
  `waitForExistence(timeout:)`) as stable identifiers in Apple's
  XCUIElement reference. Document this in the PR description if the
  reviewer asks for a click-through link.
- **Performance baselines are per-device.** A baseline committed
  from an Intel Mac fails on Apple Silicon CI and vice versa. Run
  on the same architecture you gate against.
- **Cross-process drag-and-drop** between two apps is partially
  supported via `XCUICoordinate` interactions; complex multi-app
  flows often need Apple Mac2 driver via Appium for parity with
  Windows / Linux test sources.
- **GPU-rendered content** (Metal, CALayer-only views) does not
  publish accessibility children — same caveat as
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- **Sandbox restrictions** for App-Store apps under test prevent
  some test-time file-system writes; use `XCTestObservationCenter`
  for in-process observation rather than out-of-process file diffs.

## References

- *Testing with Xcode* — UI Testing chapter ([appleuit][appleuit]).
- *Testing with Xcode* — Writing Tests chapter ([applewt][applewt]).
- Apple XCTest framework reference — stable identifier "Apple XCTest
  framework reference" (modern docs at
  developer.apple.com/documentation/xctest; SPA-shell, cite by ID).
- Apple XCUIApplication / XCUIElement / XCUIElementQuery — stable
  identifiers in the Apple developer documentation; cite by class
  name.
- Strategic frame:
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- Sibling skills in this plugin:
  [`winappdriver`](../winappdriver/SKILL.md) (Windows UIA),
  [`at-spi-linux`](../at-spi-linux/SKILL.md) (Linux AT-SPI),
  [`qt-test-framework`](../qt-test-framework/SKILL.md) (Qt in-process).
- Downstream:
  [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).
