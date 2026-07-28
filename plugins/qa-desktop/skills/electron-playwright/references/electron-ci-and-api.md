# electron-playwright - ElectronApplication API and CI

Full `ElectronApplication` API detail and the cross-OS CI workflow, kept out of
the SKILL spine. See [SKILL.md](../SKILL.md) for the core launch-and-assert flow.

Sources: Playwright [`_electron` launch reference][pwelectron] and
[`ElectronApplication` API][pwelectronapp].

[pwelectron]: https://playwright.dev/docs/api/class-electron
[pwelectronapp]: https://playwright.dev/docs/api/class-electronapplication

## ElectronApplication API

| Member | Behaviour |
|---|---|
| `electron.launch({ args, executablePath, env, cwd, recordVideo, recordHar, timeout })` | Launches Electron; `executablePath` defaults to `node_modules/.bin/electron` ([pwelectron][pwelectron]). |
| `electronApp.evaluate(fn)` | Runs `fn` in the main process; its first argument is the result of `require('electron')`, and a returned Promise is awaited ([pwelectronapp][pwelectronapp]). |
| `electronApp.firstWindow()` | Waits for the first window and returns a Playwright `Page` ([pwelectronapp][pwelectronapp]). |
| `electronApp.browserWindow(page)` | Returns the `BrowserWindow` JSHandle for a page ([pwelectronapp][pwelectronapp]). |
| `electronApp.windows()` | Returns all opened windows ([pwelectronapp][pwelectronapp]). |

Events ([pwelectronapp][pwelectronapp]):

- `'window'` - fires for every window created and loaded; payload is a `Page`.
- `'console'` - fires when the main process calls console methods; payload is a `ConsoleMessage`.
- `'close'` - fires when the application process terminates.

Supported Electron versions: v12.2.0+, v13.4.0+, and v14+ ([pwelectron][pwelectron]).

## Cross-OS CI workflow

Linux runners need `Xvfb` (or another virtual framebuffer) because Electron
requires a display server; `xvfb-run` is the standard wrapper. macOS and Windows
GitHub-hosted runners are display-capable out of the box.

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
