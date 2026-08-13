# Spectron - legacy reference and migration to Playwright `_electron`

Spectron was a Node.js library that drove Electron applications through
ChromeDriver + the legacy WebDriverIO API - for several years the only
sanctioned end-to-end driver for Electron apps. Per the
[Spectron repository][spectronrepo]: "Spectron is officially deprecated as of
February 1, 2022." The final release was **v19.0.0** (published 2022-02-02),
pinned to Electron `^19.0.0`; the repository is archived read-only. No new
project should start on Spectron - see [SKILL.md](../SKILL.md) for the
Playwright `_electron` workflow.

[spectronrepo]: https://github.com/electron-userland/spectron
[electrontest]: https://www.electronjs.org/docs/latest/tutorial/automated-testing

## Why Spectron was deprecated

1. **ChromeDriver was the wrong substrate.** Electron's main process (Node.js,
   native modules, IPC, packaged-app lifecycle, file dialogs) sits outside the
   ChromeDriver model, so Spectron bridged it with bespoke RPC that grew
   progressively harder to keep aligned with Electron's multi-process model.
2. **The WebDriverIO sync API was retired.** Spectron's API shape depended on
   the WDIO sync API, dropped in WDIO 6+; migrating was a breaking change, so
   Spectron's surface froze.
3. **Native testing tools matured.** Per [Electron's automated-testing
   guide][electrontest], Electron now recommends Playwright, WebDriverIO
   (modern async), and Selenium - each with native Electron support paths.

## Before: a Spectron test

```js
// Legacy Spectron - DO NOT use for new code
const Application = require('spectron').Application;
const app = new Application({
  path: '/path/to/electron/MyApp.app/Contents/MacOS/MyApp',
});

before(async () => {
  await app.start();
});

after(async () => {
  if (app && app.isRunning()) {
    await app.stop();
  }
});

it('opens a window', async () => {
  const count = await app.client.getWindowCount();
  assert.strictEqual(count, 1);
});
```

## After: the Playwright `_electron` equivalent

```js
// Modern replacement (per electrontest)
const { _electron: electron } = require('playwright');

let electronApp;
beforeAll(async () => {
  electronApp = await electron.launch({ args: ['.'] });
});
afterAll(async () => {
  await electronApp.close();
});

test('opens a window', async () => {
  const windowCount = electronApp.windows().length;
  expect(windowCount).toBe(1);
});
```

## Migration shopping list

| Spectron concept | Playwright `_electron` replacement |
|---|---|
| `new Application({ path })` | `electron.launch({ args: ['.'] })` ([electrontest][electrontest]) |
| `app.start()` / `app.stop()` | `electronApp.launch()` / `electronApp.close()` |
| `app.client.<webdriver-method>` | `page = await electronApp.firstWindow()`; then standard `page.<method>` ([electrontest][electrontest]) |
| `app.browserWindow.<method>` (sync RPC into main process) | `electronApp.evaluate(({ BrowserWindow }) => { … })` - typed handle ([electrontest][electrontest]) |
| Window counting via `app.client.getWindowCount()` | `electronApp.windows().length` |
| ChromeDriver binary lifecycle | Implicit - Playwright bundles Chromium and exposes packaged-app launch directly |

Plan migration **test-file-by-test-file**, not big-bang: tag each file as
migrated, run both suites in CI until the Spectron set is empty, then delete
`spectron` from `package.json`. There is no first-party codemod, and
Spectron's main-process RPC (`app.electron.<…>`) has no 1:1
`electronApp.evaluate()` mapping for every case - some tests need a small
refactor. Projects already on WDIO for browser tests may prefer
`wdio-electron-service` ([electrontest][electrontest]) as the migration
target instead.

## Residual support contract (projects not migrating this sprint)

- **Pin** `spectron: 19.0.0` and `electron: ^19.0.0` - newer Electron breaks
  Spectron's ChromeDriver bridge ([spectronrepo][spectronrepo]).
- **Pin Node.js** to a version compatible with the bundled ChromeDriver -
  typically Node 16 for the Spectron 19 era.
- **Do not file issues upstream** - the repository is archived; patches must
  live as local forks.
- **Schedule the migration.** No security or Electron-version updates are
  coming; when stakeholders ask "but it still works," cite the Electron-version
  lock, missing security updates, and absent support - all consequences of the
  archived deprecation ([spectronrepo][spectronrepo]).
