---
component: mobile-driver-selector
type: agent
---

# mobile-driver-selector - evals

Companion eval cases for [`mobile-driver-selector`](../../mobile-driver-selector.md).
Three cases covering happy path (Android native) + branch (Flutter) +
adversarial (cross-platform no unifier).

## Eval 1: happy path - pure native Android

**Input:**
- Project root contains `app/build.gradle.kts` with `id("com.android.application")` plus a Kotlin source tree under `app/src/main/java/`.
- No `package.json`, no `pubspec.yaml`, no `ios/` directory.
- No driver preference declared.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Recommends **Espresso** as the primary driver. Rationale: Google's first-party Android UI test framework, runs in the same JVM as the app under test. Read next: `espresso-suite`. Lists "team adds a second OS target → re-evaluate for Appium" as a flip condition.

**Pass condition:** Output contains the literal substrings `Espresso` AND `espresso-suite` AND (`Android` OR `app/build.gradle`) and does NOT recommend a second co-equal primary driver.

## Eval 2: branch - Flutter project

**Input:**
- Project root contains `pubspec.yaml` with a `flutter:` block, plus `lib/main.dart`.
- No `ios/` or `android/` build files referenced (Flutter generates them at build time).

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Recommends **flutter_test + integration_test** as the primary driver. Rationale: first-party Dart test packages; widget tests for the unit layer, on-device `integration_test` for end-to-end. Read next: `flutter-testing`. Does NOT recommend Appium or Detox.

**Pass condition:** Output contains the literal substrings (`flutter_test` OR `flutter-testing`) AND `pubspec.yaml` and does NOT contain `Appium` recommendation OR `Detox` recommendation as the primary.

## Eval 3: adversarial - cross-platform with no obvious unifier

**Input:**
- Project root contains both `ios/MyApp.xcodeproj/` and `android/app/build.gradle.kts`.
- No `package.json` (so no React Native), no `pubspec.yaml` (so no Flutter).
- No team preference declared.

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to emit a single primary recommendation. Asks the user whether the team prefers ONE Appium suite (cross-OS coverage, slower feedback) OR TWO native suites (XCUITest + Espresso, faster per-OS). Lists both options with their trade-offs. Does NOT silently default to either.

**Pass condition:** Output contains the literal substring `Appium` AND (`XCUITest` OR `Espresso`) AND (`prefer` OR `which` OR `choose` OR `ask`) and does NOT contain "Recommended driver: " followed by a single value with no caveat.

## Notes

- Eval file lives outside the lint glob (`*/agents/*/evals/*` excluded by `validate.sh` and `rating-check.sh`), so this file does not need rating frontmatter.
- Pass conditions are literal-string checks; a reviewer can grep the agent's transcript output for each substring.
- Target-model dates are eval-authoring dates (2026-05-25), not execution dates.
