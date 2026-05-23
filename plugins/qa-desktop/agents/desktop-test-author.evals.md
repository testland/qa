---
name: desktop-test-author-evals
description: "Evaluation cases for the `desktop-test-author` agent — three reproducible scenarios (FlaUI happy path, Electron branch, adversarial ambiguous-spec) that exercise the agent's per-flow test authoring against concrete spec snippets and assert the emitted test file shape. Use as the D7 evidence pack for the v3.0 rating gate."
archetype: A2
rating: 24
d6: 4
d7: 4
---

# desktop-test-author — evals

Companion eval cases for [`desktop-test-author`](desktop-test-author.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding
the **Input** block as the first user message to the agent and comparing
the emitted test file against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date —
each eval is designed to be re-run against each tier.

## Eval 1 — happy path — WPF login spec + FlaUI → xUnit test

**Input:**

```
Author a desktop UI test for this user flow.

Spec: "User enters alice@example.com and correct-horse-battery-staple on the
       Login screen and clicks Login. Expected: the main window opens with
       title 'Invoices'."
App type: wpf
Target app: C:\repos\InvoiceApp\bin\Release\net8.0-windows\InvoiceApp.exe
Chosen driver: flaui
Test framework: xunit
Existing screen objects: tests/InvoiceApp.UiTests/Screens/LoginScreen.cs (empty)
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23), opus (2026-05-23)

**Expected:** Emits exactly ONE test method using `[StaFact]` or `[Fact]`. Uses `FindFirstDescendant(cf => cf.ByAutomationId(...))` for locators. Asserts on the main window title (`Assert.Equal("Invoices", ...)`). Adds three screen-object properties to `LoginScreen.cs` (UsernameField / PasswordField / LoginButton). Marks the AutomationIds as provisional (`CONFIRM:` comment).

**Pass condition:** Output contains the literal strings `Application` (the agent references the FlaUI Application surface), `FindFirstDescendant`, `ByAutomationId`, AND `Assert`. Output contains at least one `CONFIRM` marker (or equivalent provisional-locator marker). Output emits exactly ONE test method (counts `[Fact]` or `[StaFact]` occurrences = 1).

## Eval 2 — branch — Electron spec → electron-playwright test (no FlaUI imports)

**Input:**

```
Author a desktop UI test for this user flow.

Spec: "User opens the app and the main window shows the title 'Screenshot Tool'."
App type: electron
Target app: ./dist/mac/ScreenshotTool.app/Contents/MacOS/ScreenshotTool
Chosen driver: electron-playwright
Test framework: (n/a — Playwright test runner)
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23)

**Expected:** Switches to electron-playwright API. Uses `_electron.launch` + `firstWindow()`. Asserts on window title via `expect(window).toHaveTitle(...)`. Does NOT import FlaUI namespaces. Does NOT use UIA terminology (`AutomationId`, `UIA3Automation`).

**Pass condition:** Output contains `_electron.launch` AND `firstWindow`. Output does NOT contain `FlaUI` / `UIA3` / `Application.Launch(` (the FlaUI `Application.Launch` static method, distinct from Playwright's `electron.launch`). Output asserts on the title using a Playwright `expect(...).toHaveTitle(...)` shape.

## Eval 3 — adversarial — spec only, no app type → refuse to author

**Input:**

```
Author a desktop UI test for this user flow.

Spec: "User clicks the Submit button and a confirmation dialog appears."

(No app type given. No driver given. No target app path.)
```

**Target models:** sonnet (2026-05-23)

**Expected:** Refuses to author. Asks the user to provide either an app type (`wpf` / `electron` / etc.) AND a driver, OR to invoke [`desktop-driver-selector`](desktop-driver-selector.md) first. Does NOT guess the driver from the verb "click" (every desktop driver supports clicks; the choice is locked by app type, not action verb).

**Pass condition:** Output does NOT contain a generated test file body (no `[Fact]` / `[StaFact]` / `test(...)` blocks). Output contains either "refuse" / "cannot author" / "need" / "desktop-driver-selector" / "app type" (any one — signals the refuse-to-proceed message). Output asks for an app type OR suggests running `desktop-driver-selector`.

## Reproducibility notes

- Inputs are concrete; no external fixtures.
- Pass conditions are string-match checks on the emitted test file content.
- The agent's tool surface (`Write`, `Edit`, narrow `Bash(dotnet test *)` / `Bash(npm test *)`) is intentionally narrow — eval re-runs should write only to the existing test project's `Tests/` and `Screens/` directories.
- Eval cases were authored 2026-05-23 against the v3.0 framework's D7 sub-checks.
