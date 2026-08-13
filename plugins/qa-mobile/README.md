# qa-mobile

Mobile E2E testing - closes the platform gap. Native frameworks (XCUITest for iOS + macOS desktop, Espresso for Android), cross-platform drivers (Appium, Detox, Maestro), Flutter widget/integration tests, plus a device-matrix dispatcher and mobile accessibility authoring. For mobile-WEB viewport emulation, see `playwright-testing` in qa-web-e2e.

## Choosing a driver

Read down the "Signal in project root" column and stop at the first row that
matches your project:

| Signal in project root | Driver | Why | Start with |
|---|---|---|---|
| `package.json` with `react-native` in dependencies AND `detox` in devDependencies | **Detox** | Native-side gray-box runner; idle-resource synchronization avoids flake | `detox-testing` |
| `package.json` with `react-native`, no Detox | **Appium** | Cross-OS black-box driver; the team can add Detox later for speed | `appium-testing` |
| `pubspec.yaml` with `flutter:` block + `lib/main.dart` | **flutter_test + integration_test** | First-party Dart test packages; widget tests + on-device integration tests | `flutter-testing` |
| `*.xcodeproj` / `Package.swift` targeting iOS, no `package.json` | **XCUITest** | Apple's first-party UI test harness, accessibility-tree backed, ships in Xcode | `xcuitest-suite` |
| `app/build.gradle` or `build.gradle.kts` with `com.android.application` | **Espresso** | Google's first-party Android UI test framework, runs in the same JVM as the app | `espresso-suite` |
| Both `ios/` AND `android/` dirs, no RN and no Flutter | **Appium** (one suite, both OSes) OR **XCUITest + Espresso** (one per OS) | Appium when test-team capacity is small; native + native when each OS has a dedicated team | `appium-testing` |
| `.maestro/` directory with `*.yaml` flowfiles | **Maestro** for black-box flows alongside the native driver | Declarative flowfiles survive UI churn better than imperative drivers | `maestro-flows` |

Tie-breakers: don't default to Appium for every cross-platform need (native
drivers are faster when per-OS capacity exists); Detox needs the React Native
bridge, so it never fits native-only apps; Maestro pairs WITH a native driver
rather than replacing one; and don't switch driver mid-project to "fix" flake -
triage the flake first (qa-flake-triage). Picking the DEVICE matrix to run
against is a separate decision - see
[mobile-device-matrix-toolkit](skills/mobile-device-matrix-toolkit/SKILL.md).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [xcuitest-suite](skills/xcuitest-suite/SKILL.md) | Authors XCUIest UI tests for iOS / iPadOS / tvOS and macOS desktop apps - uses the three-class XCUIApplication / XCUIElement / XCUIElementQuery pattern, sets accessibility identifiers on production code, runs via `xcodebuild test` with destination, parses the `xcresult` bundle. The macOS desktop delta (destination flags, TCC permission resets) lives in references/macos.md. Use when an iOS or macOS app needs UI tests in Apple's first-party framework (no external runtime; native to Xcode). |
| Skill | [espresso-suite](skills/espresso-suite/SKILL.md) | Authors Espresso UI tests for Android - uses `onView(withId(...)).perform(...).check(matches(...))`, leans on Espresso's automatic synchronization (no `Thread.sleep`), wires `IdlingResource` for app-specific async, runs via `./gradlew connectedAndroidTest` and parses the JUnit XML output. Use when an Android app needs UI tests in Google's first-party framework. |
| Skill | [appium-testing](skills/appium-testing/SKILL.md) | Wires Appium for cross-platform mobile UI automation - uses the WebDriver protocol, picks a driver per platform (XCUITest for iOS, UiAutomator2 / Espresso for Android, Mac2 for macOS, Windows for desktop), authors tests in JS / Python / Java / Ruby / .NET, configures `desiredCapabilities`, runs against simulators / emulators / device farms. Use when a single test suite must cover both iOS and Android, or when the team's stack is multi-platform (iOS + Android + Mac + Windows). |
| Skill | [detox-testing](skills/detox-testing/SKILL.md) | Authors React Native E2E tests using Detox (Wix) - uses gray-box architecture (test runs in-process with the app), `element(by.id\|by.text\|by.label)` matchers, `waitFor()` for explicit synchronization beyond Detox's automatic async tracking, and Jest as the default test runner. Use when the app is React Native and the team wants the fastest / most-reliable RN-specific framework. |
| Skill | [maestro-flows](skills/maestro-flows/SKILL.md) | Authors mobile + web UI flows using Maestro - declarative YAML files (`tapOn`, `inputText`, `assertVisible`, `swipe`), supported targets (iOS, Android, Flutter, React Native, web), nested flow imports, JavaScript hooks for complex conditions. Use when the team wants the lowest barrier to entry for cross-platform mobile UI tests - YAML-first, no language compile step. |
| Skill | [flutter-testing](skills/flutter-testing/SKILL.md) | Authors Flutter tests across the three-layer pyramid - unit (`flutter test` for pure-Dart functions), widget (`testWidgets` + `WidgetTester` for component-level UI), integration (`flutter drive` against simulator/emulator/device for end-to-end). Picks the right layer per change shape, mocks dependencies via `mockito`, runs in CI with the Flutter Action. Use when the app is Flutter and the team wants the framework's first-party testing stack. |
| Skill | [mobile-device-matrix-toolkit](skills/mobile-device-matrix-toolkit/SKILL.md) | Dispatcher skill for orchestrating mobile UI test runs across simulators, emulators, and device farms - picks the right matrix per CI cost / coverage trade-off (3-tier model: smoke set, regression set, full release matrix), wires per-target capabilities (Appium / Detox / XCUITest), aggregates per-target JUnit XML, and emits a coverage matrix verdict. Use when a mobile suite needs to run across many target devices/OSes - directly executing 50 device configs is a CI-cost disaster; this dispatcher right-sizes per cadence. |
| Skill | [mobile-a11y-test-author](skills/mobile-a11y-test-author/SKILL.md) | Native mobile accessibility testing: iOS audits/VoiceOver, Android Espresso a11y checks/TalkBack. |
| Agent | [mobile-test-author](agents/mobile-test-author.md) | Authors mobile UI tests end to end: detects the driver from project markers (or accepts an override), scaffolds a from-zero test skeleton when no harness exists (failing INPUT NEEDED placeholders + CI workflow stub), then emits ONE XCUITest, Espresso, Detox, Flutter, Appium, or Maestro test file per behavior spec in the driver's idiomatic patterns. Use when adding a mobile UI test - whether the test project already exists or must be scaffolded first. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-mobile@testland-qa
```
