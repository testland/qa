---
component: mobile-test-author
type: agent
archetype: A2
---

# mobile-test-author - evals

Companion eval cases for [`mobile-test-author`](../../mobile-test-author.md).
Three cases covering happy path (XCUITest) + branch (Detox React Native) + adversarial
(missing target screen).

## Eval 1: happy path - XCUITest for a native iOS login flow

**Input:**
- Driver override: `XCUITest`.
- Behavior spec: "Login screen - when the user enters valid credentials and taps Submit, the app navigates to the Home screen and the title bar reads 'Home'."
- Target screen: `LoginScreen`.
- Project root contains `MyApp.xcodeproj` and an existing `MyAppUITests/` directory.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Emits one Swift file at `MyAppUITests/LoginScreenUITests.swift` containing:
- `class LoginScreenUITests: XCTestCase { override func setUpWithError() throws { ... } }`
- A `func test_login_with_valid_credentials_navigates_to_home()` method
- Inside: `let app = XCUIApplication(); app.launch(); app.textFields["username"].tap(); ... app.buttons["submit"].tap();`
- An XCTAssert against the title bar: `XCTAssertEqual(app.navigationBars.firstMatch.identifier, "Home")`
- Uses accessibility identifiers, NOT visible labels

**Pass condition:** Output contains the literal substrings `XCUIApplication()` AND `app.buttons["submit"]` AND `XCTAssert` AND `LoginScreenUITests.swift` and does NOT contain `app.staticTexts[` for the assertion (label-based, fragile).

## Eval 2: branch - Detox test for a React Native flow

**Input:**
- Driver override: `Detox`.
- Behavior spec: "Onboarding screen - tap 'Continue' twice, then 'Get Started', and the Home tab bar appears."
- Target screen: `Onboarding`.
- Project root contains `package.json` with `"react-native": "0.76.0"` and `"detox": "^20"` in devDependencies.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Emits one JS file at `e2e/onboarding.test.js` containing:
- `describe('Onboarding flow', () => { beforeEach(async () => { await device.launchApp(); }); ... })`
- `it('completes onboarding and reaches Home tab bar', async () => { await element(by.id('continue-btn')).tap(); await element(by.id('continue-btn')).tap(); await element(by.id('get-started-btn')).tap(); await expect(element(by.id('home-tab-bar'))).toBeVisible(); })`
- No manual `setTimeout` waits - relies on Detox's idle-resource synchronization

**Pass condition:** Output contains the literal substrings `device.launchApp()` AND `element(by.id(` AND `toBeVisible()` AND `e2e/onboarding.test.js` and does NOT contain `setTimeout` for synchronization.

## Eval 3: adversarial - spec missing target screen / element identifiers

**Input:**
- Behavior spec: "Test that the app works." (vague, no screen, no input sequence, no observable result)
- No target screen specified.
- No driver override.

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to author a test. Asks the user to supply either:
- A specific screen + accessibility identifier for the element under test, OR
- An observable behavior the test should assert against (not "works").

Does NOT silently invent a plausible test. Does NOT default to a driver or screen.

**Pass condition:** Output contains the literal substring `accessibility identifier` OR (`refuse` AND `screen`) AND does NOT contain `func test_` OR `it('` OR `testWidgets(` (no test code emitted).

## Notes

- Eval file lives outside the lint glob - no rating frontmatter needed.
- Pass conditions are literal-string checks; a reviewer can grep transcripts.
- Target-model dates are eval-authoring dates (2026-05-25), not execution dates.
