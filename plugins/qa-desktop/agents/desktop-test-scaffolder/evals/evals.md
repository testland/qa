---
component: desktop-test-scaffolder
type: agent
archetype: A4
---

# desktop-test-scaffolder — evals

Companion eval cases for [`desktop-test-scaffolder`](desktop-test-scaffolder.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding
the **Input** block as the first user message to the agent and inspecting
the emitted files against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date —
each eval is designed to be re-run against each tier.

## Eval 1 — happy path — WPF app + FlaUI driver → xUnit scaffold

**Input:**

```
Scaffold a desktop test project for this app.

Target app path: C:\repos\InvoiceApp\bin\Release\net8.0-windows\InvoiceApp.exe
Chosen driver: flaui
Test framework: xunit
Output directory: tests/InvoiceApp.UiTests
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23), opus (2026-05-23)

**Expected:** Emits a `.csproj` referencing `FlaUI.Core`, `FlaUI.UIA3`, `xunit`, and `Xunit.StaFact`. Emits an `AppFixture.cs` with `Application.Launch` + `UIA3Automation`. Emits at least one screen-object class with `FindFirstDescendant(cf => cf.ByAutomationId(...))` + `INPUT NEEDED` placeholder. Emits a GitHub Actions YAML with `runs-on: windows-latest`. Emits a hand-off `README.md`. Does NOT include real selectors invented by the agent — every locator carries an `INPUT NEEDED:` marker.

**Pass condition:** Output contains the literal strings `FlaUI.Core`, `FlaUI.UIA3`, `xunit`, `Application.Launch`, `windows-latest`, AND at least one `INPUT NEEDED` marker. Output does NOT contain `runs-on: ubuntu-latest` or `runs-on: macos-latest` as the primary runner.

## Eval 2 — branch — Electron app + electron-playwright driver → Playwright scaffold

**Input:**

```
Scaffold a desktop test project for this app.

Target app path: ./dist/mac/ScreenshotTool.app/Contents/MacOS/ScreenshotTool
Chosen driver: electron-playwright
Output directory: tests
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23)

**Expected:** Emits a `package.json` referencing `@playwright/test` + `playwright`. Emits a `playwright.config.ts`. Emits one placeholder spec (`*.spec.ts`) using `_electron.launch` and `firstWindow()`. Does NOT include FlaUI / WinAppDriver dependencies. CI workflow uses `npx playwright test` (or `npm test`) and lists at least `windows-latest` OR `macos-latest` OR `ubuntu-latest` as a runner.

**Pass condition:** Output contains the literal strings `@playwright/test`, `_electron`, AND `firstWindow`. Output does NOT contain `FlaUI` or `WinAppDriver` references. Output contains at least one `INPUT NEEDED` (or equivalent placeholder marker like `<PATH_TO_MAIN_JS_OR_PACKAGED_APP>`).

## Eval 3 — adversarial — driver not specified → refuse to scaffold

**Input:**

```
Scaffold a desktop test project for this app.

Target app path: C:\repos\SomeApp\bin\Release\SomeApp.exe
Output directory: tests/SomeApp.UiTests

(No driver specified.)
```

**Target models:** sonnet (2026-05-23)

**Expected:** Refuses to scaffold. Asks the user to either specify a driver (`flaui` / `winappdriver` / `electron-playwright` / etc.) OR run the [`desktop-driver-selector`](desktop-driver-selector.md) agent first. Does NOT guess the driver from the `.exe` extension (`.exe` is ambiguous — could be WPF / WinForms / Electron / Qt-on-Windows).

**Pass condition:** Output does NOT contain a generated `.csproj` or `package.json` file. Output contains either "refuse" / "cannot scaffold" / "need" / "desktop-driver-selector" / "specify" (any one — signals the refuse-to-proceed message). Output suggests running `desktop-driver-selector` OR providing an explicit driver name.

## Reproducibility notes

- Inputs are concrete; no external fixtures.
- Pass conditions are string-match checks on the emitted file contents.
- The agent's tool surface (`Write`, `Edit`, narrow `Bash`) is intentionally narrow — eval re-runs should write only to the specified output directory.
- Eval cases were authored 2026-05-23 against the v3.0 framework's D7 sub-checks.
