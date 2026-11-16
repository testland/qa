---
name: electron-playwright
description: "Use whenever an Electron desktop app needs end-to-end tests, or a Spectron suite must be migrated: Playwright's _electron.launch, renderer windows as Pages, main-process checks via electronApp.evaluate, and IPC and DOM assertions from one suite."
metadata:
  keywords: "electron, playwright, desktop, main-process, renderer"
  version: "1.2.22"
---

# electron-playwright

## Overview

Playwright ships a first-class `_electron` namespace that launches a
packaged Electron app by `executablePath` and drives both the **main
process** (Node.js, IPC, native modules) and **renderer windows**
(Chromium DOMs) from a single test ([pwelectron][pwelectron]). Per
Electron's own automated-testing tutorial ([electrontest][electrontest]),
Playwright is one of three sanctioned test stacks (alongside WebdriverIO
and Selenium) for modern Electron projects.

[pwelectron]: https://playwright.dev/docs/api/class-electron

[electrontest]: https://www.electronjs.org/docs/latest/tutorial/automated-testing

**Differentiation:** unlike `playwright-testing` (which drives a running
Chromium / Firefox / WebKit browser via the `browser` / `context` / `page`
namespaces), `electron-playwright` uses the separate `_electron` namespace to
launch a packaged binary by path and probe the main process via
`electronApp.evaluate()` ([pwelectronapp][pwelectronapp]). Renderer-side page
patterns (Page Object, accessibility-first locators, trace viewer) carry over.

[pwelectronapp]: https://playwright.dev/docs/api/class-electronapplication

For legacy Spectron suites, see
[references/spectron-migration.md](references/spectron-migration.md); for the
strategic frame, `desktop-test-strategy-reference`.

## When to use

- New Electron desktop app - pick Playwright `_electron` as the
  modern default per [electrontest][electrontest].
- Existing Electron suite still on Spectron - see the migration shopping
  list in [references/spectron-migration.md](references/spectron-migration.md).
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
  `playwright-testing`
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

`electronApp.evaluate(pageFunction)` returns the function's value and awaits a
returned Promise, so async main-process queries work naturally
([pwelectronapp][pwelectronapp]).

## Step 5 - Mapping renderer windows to main-process BrowserWindow

When a test needs the underlying `BrowserWindow` object for a window
(to assert size, fullscreen state, devtools open, etc.):

```typescript
const window = await electronApp.firstWindow();
const bwHandle = await electronApp.browserWindow(window);
const isFullScreen = await bwHandle.evaluate((bw) => bw.isFullScreen());
expect(isFullScreen).toBe(false);
```

`electronApp.browserWindow(page)` returns the `BrowserWindow` for a page as a
`JSHandle`; multi-window apps iterate `electronApp.windows()`
([pwelectronapp][pwelectronapp]). Full API table:
[references/electron-ci-and-api.md](references/electron-ci-and-api.md).

## Step 6 - Waiting for new windows + console output

The `'window'`, `'console'`, and `'close'` events fire for each new window,
main-process console writes, and process termination respectively
([pwelectronapp][pwelectronapp]); event payloads and the full API table are in
[references/electron-ci-and-api.md](references/electron-ci-and-api.md).

```typescript
// Wait for a secondary window to open after clicking
const [secondary] = await Promise.all([
  electronApp.waitForEvent('window'),
  window.getByRole('button', { name: /preferences/i }).click(),
]);
await expect(secondary.getByRole('heading', { name: /preferences/i })).toBeVisible();
```

### Traps that make Electron tests hang or flake

**1. `evaluate` functions cross a process boundary.** The function given
to `electronApp.evaluate` is serialized and run in the main process, so
it cannot see the test's local variables. Pass values as the second
argument; the function receives them after the `electron` module
([pwelectronapp][pwelectronapp]):

```typescript
const out = path.resolve('test-results/report.pdf');
await electronApp.evaluate(({ dialog }, filePath) => {
  dialog.showSaveDialog = async () => ({ canceled: false, filePath });
}, out);                               // not a closure over `out`
```

**2. Native dialogs block the test.** Playwright cannot click an OS file
picker, so a test that triggers one waits until it times out. Replace
`dialog.showOpenDialog` / `showSaveDialog` in the main process (as
above) before the click that opens it. The app's code for users stays
unchanged.

**3. `firstWindow()` is the first window, not the main one.** With a
splash screen it returns the splash. Wait for the window you need:

```typescript
const main = await electronApp.waitForEvent('window', {
  predicate: (p) => p.url().endsWith('/index.html'),
});
```

For a window opened by a click, start waiting before the click
(`Promise.all`, as in Step 6); reading `electronApp.windows()[1]` right
after the click races the window creation.

**4. Get a page's own `BrowserWindow`.** `BrowserWindow.getFocusedWindow()`
returns `null` when no window has focus, which is common under
`xvfb-run`. Use `electronApp.browserWindow(page)` (Step 5) to read the
bounds or state of exactly that page's window.

**5. No `require` in the renderer.** Context isolation is on by default
since Electron 12 ([electron-isolation][eiso]), and an app without Node
integration in the renderer has no `require` there, so
`window.evaluate(() => require('fs'))` throws. Check side effects through the UI, the API the
preload script exposes, Node's `fs` in the test process, or
`electronApp.evaluate(({ app }) => app.getPath('userData'))`.

**6. Web-first assertions.** `expect(await page.title()).toBe('Settings')`
reads once and fails if the title is set a moment later.
`await expect(page).toHaveTitle('Settings')` retries until the timeout
([pwbest][pwbest]).

**7. Always close the app,** in `afterEach` or a fixture, so a failed
test does not leave Electron running and hold the user-data directory.

[pwbest]: https://playwright.dev/docs/best-practices
[eiso]: https://www.electronjs.org/docs/latest/tutorial/context-isolation

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
`playwright-testing`.)

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
`playwright-testing`).

## Step 9 - Parsing results

JUnit XML output (`reports/electron-junit.xml` from Step 7) feeds
`junit-xml-analysis`
for aggregation. The HTML reporter is identical to web-Playwright
([pwelectron][pwelectron]).

## Step 10 - CI integration

Run across a Windows / macOS / Linux matrix; Linux needs an `xvfb-run` virtual
display because Electron requires a display server, while macOS and Windows
GitHub-hosted runners are display-capable out of the box. Full workflow:
[references/electron-ci-and-api.md](references/electron-ci-and-api.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Driving Electron via plain `chromium.launch()` from web-only Playwright | Misses main-process surface entirely; can't query `app.*` or `BrowserWindow.*` | Use `_electron.launch()` ([pwelectron][pwelectron]) |
| Hard-coded `executablePath` checked into the repo for a single OS | Cross-OS CI matrix breaks | Resolve per `process.platform` (Step 3) |
| Tests that share a single `electronApp` across many tests without cleanup | One leaked window state contaminates the next test | Per-test `electronApp = await electron.launch(...)` + `await electronApp.close()` |
| Running Electron tests with default `workers > 1` | GPU / user-data directory collisions; flaky launches | `workers: 1` (Step 7) |
| Forgetting `xvfb-run` on hosted Linux CI | "Failed to initialize display" launch failure | `xvfb-run --auto-servernum` wrapper (Step 10) |
| Capturing test variables inside `electronApp.evaluate` | The function runs in the main process; the variable is undefined there | Pass it as the second argument |
| `firstWindow()` in an app with a splash screen | Returns the splash, so locators time out | `waitForEvent('window', { predicate })` |
| `BrowserWindow.getFocusedWindow()` in tests | `null` under xvfb or when nothing has focus | `electronApp.browserWindow(page)` |
| Probing main-process modules from `window.evaluate()` | `window.evaluate()` runs in the renderer; doesn't see main-process globals | Use `electronApp.evaluate()` ([pwelectronapp][pwelectronapp]) |
| Mixing Spectron and Playwright assertions in the same suite | Two driver lifecycles compete for the same Electron process | Migrate file-by-file per [references/spectron-migration.md](references/spectron-migration.md) |
| Asserting on Electron internal IDs (`__electron_id`) for locators | Internal; changes between Electron versions | Use accessibility-first locators (`getByRole` / `getByLabel`) per `playwright-testing` |

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
  `desktop-test-strategy-reference`.
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
- Playwright best practices (web-first assertions) - [pwbest][pwbest].
- Electron context isolation - [eiso][eiso].
- Legacy migration reference:
  [references/spectron-migration.md](references/spectron-migration.md).
- Strategic frame:
  `desktop-test-strategy-reference`.
- Web-side neighbour:
  `playwright-testing` - page-automation patterns that carry over to the renderer surface.
