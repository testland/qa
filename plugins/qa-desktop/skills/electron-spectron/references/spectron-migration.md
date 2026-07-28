# Spectron -> Playwright migration reference

The before/after code and the concept-by-concept mapping, kept out of the SKILL
spine. See [SKILL.md](../SKILL.md) for the deprecation facts and the residual
support contract, and `electron-playwright` for the full Playwright `_electron`
authoring, running, and CI workflow.

Sources: [Spectron repository (archived)][spectronrepo],
[Electron Automated Testing tutorial][electrontest].

[spectronrepo]: https://github.com/electron-userland/spectron
[electrontest]: https://www.electronjs.org/docs/latest/tutorial/automated-testing

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

A Spectron-to-Playwright migration touches:

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
`spectron` from `package.json`.
