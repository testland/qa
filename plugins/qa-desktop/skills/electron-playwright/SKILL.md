---
name: electron-playwright
description: "Authors Playwright `_electron` tests for packaged Electron desktop apps - launches the app via `electron.launch({ args })`, returns an `ElectronApplication` handle, drives renderer windows as Playwright `Page` objects, and probes the main process via `electronApp.evaluate(({ app, BrowserWindow }) => …)`. Distinct from `qa-web-e2e/playwright-testing` (page automation against running browsers); this wraps the `_electron` API for launching packaged Electron apps and probing main + renderer processes. Use for end-to-end tests of Electron apps where main-process state, IPC, and renderer DOM must all be asserted from one suite."
keywords:
  - electron
  - playwright
  - desktop
  - main-process
  - renderer
---

# electron-playwright

## Overview

Playwright ships a first-class `_electron` namespace for launching
packaged Electron apps and driving both the **main process** (Node.js,
IPC, native modules) and **renderer windows** (Chromium DOMs) from a
single test. Per
[Playwright's `_electron` API page][pwelectron]:

[pwelectron]: https://playwright.dev/docs/api/class-electron

> "Launches electron application specified with the executablePath."

Per Electron's own automated-testing tutorial
([electrontest][electrontest]), Playwright is one of three sanctioned
test stacks (alongside WebdriverIO and Selenium) for modern Electron
projects.

[electrontest]: https://www.electronjs.org/docs/latest/tutorial/automated-testing

**Differentiation:** this skill is **distinct from**
[`qa-web-e2e/playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md),
which drives a running Chromium / Firefox / WebKit browser via the
`browser`, `context`, and `page` namespaces. `electron-playwright`
wraps the separate `_electron` namespace ([pwelectron][pwelectron]) - 
it launches a packaged Electron binary by path, returns an
`ElectronApplication` handle, and exposes the main process via
`electronApp.evaluate()` ([pwelectronapp][pwelectronapp]). Page
automation patterns (Page Object, accessibility-first locators, trace
viewer) carry over for the renderer side; main-process testing is the
new surface this skill adds.

[pwelectronapp]: https://playwright.dev/docs/api/class-electronapplication

For legacy Spectron-based suites being migrated, see
[`electron-spectron`](../electron-spectron/SKILL.md) (the legacy
reference) and the strategic frame in
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).

## When to use

- New Electron desktop app - pick Playwright `_electron` as the
  modern default per [electrontest][electrontest].
- Existing Electron suite still on Spectron - see migration shopping
  list in [`electron-spectron`](../electron-spectron/SKILL.md).
- Tests need to assert **main-process** state (e.g.,
  `app.isPackaged`, `BrowserWindow` count, IPC channel payloads) in
  addition to renderer DOM.
- Tests need to exercise **packaged-app** behaviour (file
  associations, single-instance lock, custom protocol handlers) that
  is unreachable from browser-only Playwright.

## Step 1 - Install

Per [electrontest][electrontest]:

```bash
npm install --save-dev @playwright/test
```

Playwright's `_electron` module is bundled inside `playwright` /
`@playwright/test` - no extra package is needed
([pwelectron][pwelectron]). Supported Electron versions per
[pwelectron][pwelectron]: "Electron v12.2.0+, v13.4.0+, and v14+".

## Step 2 - Author the first test

The canonical example from [electrontest][electrontest]:

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches and is not packaged in dev', async () => {
  const electronApp = await electron.launch({ args: ['.'] });

  // Main-process assertion: probe the Electron `app` module
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged;
  });
  expect(isPackaged).toBe(false);

  // Renderer assertion: take a screenshot of the first window
  const window = await electronApp.firstWindow();
  await window.screenshot({ path: 'intro.png' });

  await electronApp.close();
});
```

What's going on:

- `electron.launch({ args: ['.'] })` launches Electron with the
  current directory as the main-script argument
  ([pwelectron][pwelectron]). For a packaged app, pass
  `executablePath` to the packaged binary instead - its default per
  [pwelectron][pwelectron] is `node_modules/.bin/electron`.
- `electronApp.evaluate(pageFunction)` runs `pageFunction` **inside
  the main process**; the first argument is "always the result of
  the `require('electron')` in the main app script"
  ([pwelectronapp][pwelectronapp]).
- `electronApp.firstWindow()` "waits for the first application
  window to be opened" ([pwelectronapp][pwelectronapp]) and returns
  a Playwright `Page` - every standard
  [`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md)
  locator (`getByRole`, `getByLabel`) works on it.

## Step 3 - Launching a packaged binary

For tests of the **packaged** app (the artifact users install):

```typescript
import path from 'node:path';
import { _electron as electron } from '@playwright/test';

const PACKAGED_BIN = process.platform === 'win32'
  ? path.resolve('dist/win-unpacked/MyApp.exe')
  : process.platform === 'darwin'
    ? path.resolve('dist/mac/MyApp.app/Contents/MacOS/MyApp')
    : path.resolve('dist/linux-unpacked/myapp');

const electronApp = await electron.launch({
  executablePath: PACKAGED_BIN,
  args: [],
  env: { ...process.env, NODE_ENV: 'test' },
  recordVideo: { dir: 'test-results/videos' },
});
```

The `executablePath`, `env`, `cwd`, `recordVideo`, `recordHar`, and
`timeout` options are documented on the `_electron` launch reference
([pwelectron][pwelectron]).

## Step 4 - Probing main + renderer in one test

Multi-surface assertion - main process owns app lifecycle, renderer
owns DOM:

```typescript
test('opening a project loads it into the renderer', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();

  // Renderer-side action via Playwright Page API
  await window.getByRole('button', { name: /open project/i }).click();
  await window.getByLabel('Project path').fill('/tmp/demo-project');
  await window.getByRole('button', { name: /confirm/i }).click();

  // Renderer-side assertion
  await expect(window.getByRole('heading', { name: /demo-project/i })).toBeVisible();

  // Main-process assertion: recent-projects state mutated
  const recents: string[] = await electronApp.evaluate(({ app }) => {
    return app.getRecentDocuments();
  });
  expect(recents).toContain('/tmp/demo-project');

  await electronApp.close();
});
```

Per [pwelectronapp][pwelectronapp], `electronApp.evaluate(pageFunction)`
returns the value of `pageFunction`, and "if the function passed to
the electronApplication.evaluate() returns a Promise, then
electronApplication.evaluate() would wait for the promise to resolve
and return its value" - so async main-process queries work
naturally.

## Step 5 - Mapping renderer windows to main-process BrowserWindow

When a test needs the underlying `BrowserWindow` object for a window
(to assert size, fullscreen state, devtools open, etc.):

```typescript
const window = await electronApp.firstWindow();
const bwHandle = await electronApp.browserWindow(window);
const isFullScreen = await bwHandle.evaluate((bw) => bw.isFullScreen());
expect(isFullScreen).toBe(false);
```

`electronApp.browserWindow(page)` "returns the BrowserWindow object
that corresponds to the given Playwright page"
([pwelectronapp][pwelectronapp]) as a `JSHandle`. Multi-window apps
iterate `electronApp.windows()`, which is described as a "convenience
method that returns all the opened windows" ([pwelectronapp][pwelectronapp]).

## Step 6 - Waiting for new windows + console output

Async events fire when modal dialogs, secondary windows, or main-
process console writes happen. Per [pwelectronapp][pwelectronapp]:

- The `'window'` event is "emitted when every window that is created
  and loaded in Electron" with a `Page` payload.
- The `'console'` event is emitted when "main process calls console
  methods" with a `ConsoleMessage` payload.
- The `'close'` event fires "when the application process has been
  terminated".

```typescript
// Wait for a secondary window to open after clicking
const [secondary] = await Promise.all([
  electronApp.waitForEvent('window'),
  window.getByRole('button', { name: /preferences/i }).click(),
]);
await expect(secondary.getByRole('heading', { name: /preferences/i })).toBeVisible();
```

## Step 7 - Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/electron',
  fullyParallel: false,   // Electron launches are heavy; serialize
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'reports/electron-junit.xml' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

Electron-launch tests typically run with `workers: 1` because each
launch spawns an Electron process with its own GPU/IPC stack; full
parallel launches collide on the user-data directory and on
GPU-shared-memory regions. (Web-only Playwright defaults to parallel
per
[`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md).)

## Step 8 - Running

```bash
# All Electron tests
npx playwright test --config=playwright.electron.config.ts

# A specific test file
npx playwright test tests/electron/launch.spec.ts

# Headed (the Electron window stays visible)
npx playwright test --headed

# Trace viewer for a failing run
npx playwright show-trace test-results/<…>/trace.zip
```

The trace viewer shows DOM snapshots of the renderer windows and the
`evaluate` calls into the main process side-by-side - debug parity
with normal Playwright traces (the trace viewer surface is part of
the shared Playwright toolchain per
[`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md)).

## Step 9 - Parsing results

JUnit XML output (`reports/electron-junit.xml` from Step 7) feeds
[`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)
for aggregation. The HTML reporter is identical to web-Playwright
([pwelectron][pwelectron]).

## Step 10 - CI integration

```yaml
# .github/workflows/electron-e2e.yml
jobs:
  test:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build:electron
      # On Linux, headless Electron needs a virtual display
      - name: Run E2E (Linux with Xvfb)
        if: runner.os == 'Linux'
        run: xvfb-run --auto-servernum npx playwright test --config=playwright.electron.config.ts
      - name: Run E2E (Windows/macOS)
        if: runner.os != 'Linux'
        run: npx playwright test --config=playwright.electron.config.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.os }}
          path: playwright-report/
```

Linux runners need `Xvfb` or another virtual framebuffer because
Electron requires a display server; `xvfb-run` is the standard
wrapper. macOS + Windows runners on GitHub-hosted are display-capable
out of the box.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Driving Electron via plain `chromium.launch()` from web-only Playwright | Misses main-process surface entirely; can't query `app.*` or `BrowserWindow.*` | Use `_electron.launch()` ([pwelectron][pwelectron]) |
| Hard-coded `executablePath` checked into the repo for a single OS | Cross-OS CI matrix breaks | Resolve per `process.platform` (Step 3) |
| Tests that share a single `electronApp` across many tests without cleanup | One leaked window state contaminates the next test | Per-test `electronApp = await electron.launch(...)` + `await electronApp.close()` |
| Running Electron tests with default `workers > 1` | GPU / user-data directory collisions; flaky launches | `workers: 1` (Step 7) |
| Forgetting `xvfb-run` on hosted Linux CI | "Failed to initialize display" launch failure | `xvfb-run --auto-servernum` wrapper (Step 10) |
| Probing main-process modules from `window.evaluate()` | `window.evaluate()` runs in the renderer; doesn't see main-process globals | Use `electronApp.evaluate()` ([pwelectronapp][pwelectronapp]) |
| Mixing Spectron and Playwright assertions in the same suite | Two driver lifecycles compete for the same Electron process | Migrate file-by-file per [`electron-spectron`](../electron-spectron/SKILL.md) |
| Asserting on Electron internal IDs (`__electron_id`) for locators | Internal; changes between Electron versions | Use accessibility-first locators (`getByRole` / `getByLabel`) per [`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md) |

## Limitations

- **`_electron` is documented as experimental** historically; per
  [electrontest][electrontest] it is one of the three recommended
  paths but Playwright's own docs do not warrant the same stability
  guarantees as the browser API.
- **Electron version drift.** A new Electron major can change main-
  process module shapes (`app.getRecentDocuments()` deprecations,
  etc.); pin Electron in `package.json` and update intentionally.
- **GPU-rendered content** (WebGL, `<canvas>`, accelerated video) is
  opaque to renderer-side accessibility queries - same caveat as in
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- **Multi-instance apps** with single-instance-lock need a custom
  `userData` per-test (via `app.setPath('userData', …)` in test
  fixture) - otherwise a second launch races the first.
- **Native OS dialogs** (Win32 file picker, macOS `NSSavePanel`) are
  outside the Electron renderer; tests should stub `dialog.showOpenDialog`
  via `electronApp.evaluate()` rather than try to click through them.
- **`workers: 1` slows the suite.** For large suites, shard across
  CI jobs (`--shard=1/4`) rather than raise per-job concurrency.

## References

- Playwright `_electron` API - [pwelectron][pwelectron].
- Playwright `ElectronApplication` API - [pwelectronapp][pwelectronapp].
- Electron Automated Testing tutorial - [electrontest][electrontest].
- Sibling skill: [`electron-spectron`](../electron-spectron/SKILL.md) - 
  legacy migration reference.
- Strategic frame:
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- Web-side neighbour:
  [`playwright-testing`](../../../qa-web-e2e/skills/playwright-testing/SKILL.md) - page-automation patterns that carry over to the renderer surface.
