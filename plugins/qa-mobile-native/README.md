# qa-mobile-native

Mobile + mobile-web E2E testing - closes the platform gap. Native frameworks (XCUITest, Espresso), cross-platform drivers (Appium, Detox, Maestro), Flutter widget/integration tests, plus a device-matrix dispatcher, mobile-web emulation runner, touch-gesture tester, and mobile Web Vitals budget reference.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [xcuitest-suite](skills/xcuitest-suite/SKILL.md) | Authors XCUIest UI tests for iOS / iPadOS / tvOS - uses the three-class XCUIApplication / XCUIElement / XCUIElementQuery pattern, sets accessibility identifiers on production code, runs via `xcodebuild test` with destination, parses the `xcresult` bundle. Use when an iOS app needs UI tests in Apple's first-party framework (no external runtime; native to Xcode). |
| Skill | [espresso-suite](skills/espresso-suite/SKILL.md) | Authors Espresso UI tests for Android - uses `onView(withId(...)).perform(...).check(matches(...))`, leans on Espresso's automatic synchronization (no `Thread.sleep`), wires `IdlingResource` for app-specific async, runs via `./gradlew connectedAndroidTest` and parses the JUnit XML output. Use when an Android app needs UI tests in Google's first-party framework. |
| Skill | [appium-testing](skills/appium-testing/SKILL.md) | Wires Appium for cross-platform mobile UI automation - uses the WebDriver protocol, picks a driver per platform (XCUITest for iOS, UiAutomator2 / Espresso for Android, Mac2 for macOS, Windows for desktop), authors tests in JS / Python / Java / Ruby / .NET, configures `desiredCapabilities`, runs against simulators / emulators / device farms. Use when a single test suite must cover both iOS and Android, or when the team's stack is multi-platform (iOS + Android + Mac + Windows). |
| Skill | [detox-testing](skills/detox-testing/SKILL.md) | Authors React Native E2E tests using Detox (Wix) - uses gray-box architecture (test runs in-process with the app), `element(by.id\|by.text\|by.label)` matchers, `waitFor()` for explicit synchronization beyond Detox's automatic async tracking, and Jest as the default test runner. Use when the app is React Native and the team wants the fastest / most-reliable RN-specific framework. |
| Skill | [maestro-flows](skills/maestro-flows/SKILL.md) | Authors mobile + web UI flows using Maestro - declarative YAML files (`tapOn`, `inputText`, `assertVisible`, `swipe`), supported targets (iOS, Android, Flutter, React Native, web), nested flow imports, JavaScript hooks for complex conditions. Use when the team wants the lowest barrier to entry for cross-platform mobile UI tests - YAML-first, no language compile step. |
| Skill | [flutter-testing](skills/flutter-testing/SKILL.md) | Authors Flutter tests across the three-layer pyramid - unit (`flutter test` for pure-Dart functions), widget (`testWidgets` + `WidgetTester` for component-level UI), integration (`flutter drive` against simulator/emulator/device for end-to-end). Picks the right layer per change shape, mocks dependencies via `mockito`, runs in CI with the Flutter Action. Use when the app is Flutter and the team wants the framework's first-party testing stack. |
| Skill | [mobile-device-matrix-toolkit](skills/mobile-device-matrix-toolkit/SKILL.md) | Dispatcher skill for orchestrating mobile UI test runs across simulators, emulators, and device farms - picks the right matrix per CI cost / coverage trade-off (3-tier model: smoke set, regression set, full release matrix), wires per-target capabilities (Appium / Detox / XCUITest), aggregates per-target JUnit XML, and emits a coverage matrix verdict. Use when a mobile suite needs to run across many target devices/OSes - directly executing 50 device configs is a CI-cost disaster; this dispatcher right-sizes per cadence. |
| Skill | [mobile-web-emulation-runner](skills/mobile-web-emulation-runner/SKILL.md) | Builds a workflow to run web E2E tests under mobile viewports + DPRs (device pixel ratios) - uses Playwright's `devices` catalog (iPhone 15, Pixel 7, etc.), runs the existing test suite per-device as separate matrix shards, captures per-device screenshots for visual review, and asserts mobile-specific behaviors (touch interactions, viewport-conditional layout). Use when the web app supports mobile and the team wants regression coverage without spinning up real Android/iOS test rigs. |
| Skill | [touch-gesture-tester](skills/touch-gesture-tester/SKILL.md) | Verifies touch-gesture handlers (tap, double-tap, long-press, swipe, pinch, rotate, pan) work as expected under both mobile-emulation (Playwright) and native (XCUITest / Espresso / Detox) - distinguishes \"mouse click handler also fires on tap\" from \"real touch event fired with correct properties.\" Use when the app has bespoke gesture handlers (custom carousels, sliders, drag-drop, pull-to-refresh) and the team needs targeted gesture verification beyond generic UI assertions. |
| Skill | [mobile-perf-budget](skills/mobile-perf-budget/SKILL.md) | Pure-reference skill for mobile-web performance budgets - Core Web Vitals at the 75th percentile mobile (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; FID retired March 2024 in favor of INP), Lighthouse mobile profile config, per-route resource budgets (JS bundle, image weight, font load). Use as the team's reference for \"what should the mobile perf gate enforce\" - paired with `lighthouse-perf` (the runner) and `lighthouse-budget-author` (the per-route author). |
| Agent | [mobile-driver-selector](agents/mobile-driver-selector.md) | Action-taking agent that reads a target mobile project (`ios/`, `android/`, `lib/`, `package.json`, `pubspec.yaml`, `*.xcodeproj`, `app/build.gradle`) and emits one concrete mobile test driver recommendation - XCUITest, Espresso, Detox, Flutter, Appium, or Maestro - plus rationale and which preloaded SKILL.md to read next. Distinct from `qa-mobile-native/mobile-device-matrix-toolkit` (S4 - picks DEVICE matrix to run against, not the test framework). Use when starting a new mobile test project and the team has not yet committed to a driver. |
| Agent | [mobile-test-author](agents/mobile-test-author.md) | Action-taking agent that authors ONE mobile test file per behavior spec - detects driver via mobile-driver-selector (or accepts an override), then emits one XCUITest, Espresso, Detox, Flutter, Appium, or Maestro test using the chosen driver's idiomatic patterns. Distinct from qa-shift-left/spec-to-suite-orchestrator (language-agnostic project skeleton) - narrower scope, single-file output, mobile platforms only. Sibling of qa-desktop/desktop-test-author and the per-language unit-test authors in qa-unit-tests-{net,js,jvm,python,go-rust}. Use when adding one mobile test to an existing test project. |
| Agent | [mobile-test-scaffolder](agents/mobile-test-scaffolder.md) | Detects the platform and emits a from-zero mobile test skeleton (Detox / XCUITest / Espresso / Maestro). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-mobile-native@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
