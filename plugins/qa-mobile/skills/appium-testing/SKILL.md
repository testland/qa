---
name: appium-testing
description: "Use whenever one mobile UI test suite must run on iOS and Android (native or React Native apps), or an Appium suite fails, flakes or breaks after an upgrade: XCUITest, UiAutomator2 and Espresso drivers, capabilities, clients in JS, Python, Java, Ruby or .NET, simulators, emulators and device farms."
---

# appium-testing

[app]: https://appium.io/docs/en/latest/
[mig3]: https://github.com/appium/appium/blob/master/packages/appium/docs/en/guides/migrating-2-to-3.md
[uia2]: https://github.com/appium/appium/blob/master/packages/appium/docs/en/quickstart/uiauto2-driver.md
[wdiosel]: https://webdriver.io/docs/selectors
[wdiosvc]: https://webdriver.io/docs/appium-service
[imgplugin]: https://github.com/appium/appium/tree/master/packages/images-plugin

The driver model is the load-bearing concept: Appium itself is the
WebDriver protocol; per-platform automation is a **driver** (XCUITest
driver talks to iOS, UiAutomator2 / Espresso to Android, Mac2 to
macOS, Windows to Windows desktop). Client libraries exist for
JavaScript, Python, Java, Ruby, and .NET (per [appium-docs][app]).

## When to use

- A team needs **one** test suite to cover iOS + Android.
- The product is multi-platform (mobile + desktop + TV) and one
  framework should drive all of them.
- Existing Selenium expertise transfers (same WebDriver mental
  model).
- Device-farm integration matters (BrowserStack / Sauce Labs / AWS
  Device Farm all support Appium natively).

If the app is iOS-only, `xcuitest-suite`
is lighter (no external server). For React Native specifically,
`detox-testing` is faster.

## Step 1 - Install Appium server + driver

Appium 3 is current (3.9.0 on npm, 3 Nov 2026). Per [migrating-2-to-3][mig3]
it needs Node `^20.19.0 || ^22.12.0 || >=24.0.0` and npm 10 or newer.

```bash
npm install -g appium

# Install per-platform drivers:
appium driver install xcuitest         # iOS
appium driver install uiautomator2     # Android
appium driver install espresso         # Android (alternative; gray-box)
appium driver install mac2             # macOS desktop
appium driver install windows          # Windows desktop

# Verify:
appium driver list
appium driver doctor uiautomator2   # checks ANDROID_HOME, JDK, SDK tools
```

Per [uia2-quickstart][uia2], `appium driver doctor` reporting "0 required
fixes needed" means the Android setup is complete; it needs the Android
SDK platform tools, `ANDROID_HOME` and a JDK with `JAVA_HOME`. Drivers
are versioned separately from the server: after a server upgrade, run
`appium driver update <name>` too.

## Step 2 - Start the server

```bash
appium                       # listens on http://127.0.0.1:4723/
appium --allow-insecure=uiautomator2:adb_shell   # opt-in risky features
```

Clients connect to `http://localhost:4723` with no `/wd/hub` suffix
(that suffix went away with Appium 2). Per [migrating-2-to-3][mig3],
Appium 3 "makes the scope prefix mandatory" on insecure feature flags:
`adb_shell` alone now throws; write `uiautomator2:adb_shell` or
`*:adb_shell`.

## Step 3 - Author a test (JavaScript example)

```javascript
import { remote } from 'webdriverio';

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  'appium:app': '/path/to/app.apk',
};

describe('Cart flow', () => {
  let driver;

  before(async () => {
    driver = await remote({
      hostname: 'localhost',
      port: 4723,
      capabilities,
    });
  });

  after(async () => {
    await driver.deleteSession();
  });

  it('adds an item to cart', async () => {
    const addButton = await driver.$('id=add_to_cart_button');
    await addButton.click();

    // WebdriverIO's expect retries until the text matches or times out
    await expect(driver.$('id=cart_count')).toHaveText('1');
  });
});
```

The `automationName` capability picks the driver:
`UiAutomator2` (Android), `XCUITest` (iOS), `Espresso` (Android
gray-box), `Mac2`, `Windows`.

## Step 4 - Capabilities catalog

| Capability              | Use                                                  |
|-------------------------|------------------------------------------------------|
| `platformName`          | `iOS` / `Android` / `Mac` / `Windows`                 |
| `appium:automationName`  | Driver name (XCUITest / UiAutomator2 / Espresso etc.) |
| `appium:deviceName`     | Logical device name (Simulator / Emulator / specific) |
| `appium:platformVersion` | OS version (e.g. `14.0`)                             |
| `appium:app`            | Path to .apk / .ipa                                   |
| `appium:bundleId` / `appium:appPackage` | Pre-installed app                    |
| `appium:noReset`        | Don't reinstall app between sessions                  |
| `appium:newCommandTimeout` | Server idle timeout (default 60s)                  |

For device-farm runs, capabilities also include the farm's
authentication tokens / device-pool selection.

## Step 5 - Selector strategies (cross-platform)

Per [wdio-selectors][wdiosel], "For both platforms, getting an element
(or multiple elements) by their `accessibility id` is usually the best
method." The platform-native strategies are the next choice; XPath is
the last:

```javascript
// Accessibility ID - same selector on iOS and Android
await driver.$('~login-button').click();

// Android: UiAutomator selector
await driver.$('android=new UiSelector().text("Cancel").className("android.widget.Button")');

// iOS: predicate string and class chain (fast, evaluated by XCUITest)
await driver.$(`-ios predicate string:type == 'XCUIElementTypeSwitch' && name CONTAINS 'Allow'`);
await driver.$('-ios class chain:**/XCUIElementTypeCell[`name BEGINSWITH "D"`]/**/XCUIElementTypeButton');

// XPath - works everywhere; slow and brittle, last resort
await driver.$('//XCUIElementTypeButton[@name="Submit"]');
```

For a canvas or game UI with no element tree, the images plugin finds an
element from a template image. Per [images-plugin][imgplugin], install it
with `appium plugin install images` and enable it at start with
`appium --use-plugins=images`.

The cross-platform strategy: production code sets the same
accessibility ID on both iOS (`accessibilityIdentifier`) and
Android (`contentDescription` or `resource-id`). Tests use one
selector for both.

## Step 6 - Run

```bash
npm install --save-dev @wdio/appium-service appium@^3

# Local with one platform
WDIO_OS=android npx wdio run wdio.conf.js

# Multi-platform: WebdriverIO multi-capability config
# wdio.conf.js
exports.config = {
    capabilities: [
        { platformName: 'iOS', 'appium:platformVersion': '17.4', ...iosCaps },
        { platformName: 'Android', 'appium:platformVersion': '14', ...androidCaps },
    ],
    runner: 'local',
    services: ['appium'],
};
```

Per [wdio-appium-service][wdiosvc], the service "starts the Appium
Server in a child process", so there is no separate server step. The
same page notes that "WebdriverIO 10 requires Appium 3" and the service
"refuses to launch Appium 1.x or 2.x": upgrade the server and drivers
together with WebdriverIO.

## Step 7 - CI integration

```yaml
# Multi-platform matrix
jobs:
  ui-tests:
    strategy:
      matrix:
        platform: [iOS, Android]
    runs-on: ${{ matrix.platform == 'iOS' && 'macos-15' || 'ubuntu-latest' }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24 }
      - run: npm ci   # project pins appium@^3 + @wdio/appium-service
      - run: npx appium driver install ${{ matrix.platform == 'iOS' && 'xcuitest' || 'uiautomator2' }}

      - if: matrix.platform == 'Android'
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: WDIO_OS=android npx wdio run wdio.conf.js

      - if: matrix.platform == 'iOS'
        run: |
          xcrun simctl boot 'iPhone 15'
          WDIO_OS=ios npx wdio run wdio.conf.js
```

## Upgrading from Appium 2 to Appium 3

Per [migrating-2-to-3][mig3], the changes that break existing suites:

| Change | What to do |
|---|---|
| Node minimum is 20.19 (20.x), 22.12 (22.x) or any 24+, and npm 10+ | Upgrade Node on laptops and CI images first. |
| Insecure feature flags need a scope prefix | `--allow-insecure=adb_shell` becomes `uiautomator2:adb_shell` or `*:adb_shell`; server-scope features such as `session_discovery` need `*:`. |
| Deprecated endpoints removed, e.g. `GET /sessions` | Use `GET /appium/sessions` (needs the `session_discovery` feature flag). |
| `POST /session` no longer accepts `desiredCapabilities` / `requiredCapabilities` | Send W3C capabilities with the `appium:` vendor prefix (Step 4). Old clients that still send JSONWP payloads must be upgraded. |
| Older drivers | Run `appium driver update <name>` so driver versions support the new server. |
| Appium Inspector "Attach to Session" | Inspector 2025.3.1 or later. |

Upgrade order that avoids a broken half-state: Node, then `appium@^3`,
then every driver, then the client (WebdriverIO 10 or the matching Java,
Python, Ruby or .NET client), then fix flags and capabilities.

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Per-platform separate test code                                       | Defeats Appium's reuse value.                                             | One test, multi-capability config (Step 6). |
| XPath selectors as default                                            | Slowest selector strategy; brittle to UI tree changes.                   | Accessibility IDs first (Step 5). |
| Hard-coded device name (`'iPhone 15'`) in shared config               | Test fails on a machine or runner where that simulator doesn't exist.    | Read device name and OS version from env vars per runner, and list the available simulators (`xcrun simctl list devices`) in CI before booting. |
| Ignoring `noReset` between tests                                       | App state leaks; flaky.                                                  | `noReset: false` (default) reinstalls per session. |
| One mega-test using `before` for the whole suite                      | Suite-long flake; one tiny issue restarts everything.                    | Per-test `beforeEach` reset; small focused tests. |
| Mixing Appium 1.x, 2.x and 3.x docs and examples                      | Server URL, capability format and feature-flag syntax differ; failures are cryptic. | Pin `appium@^3` in `package.json`, follow the Appium 3 docs, migrate with the table above. |
| Server upgraded, drivers left on old versions                         | Sessions fail to start or commands disappear after the upgrade.          | `appium driver update` after every server upgrade. |

## Limitations

- **External server.** Every command is an HTTP round trip to the
  Appium server and then to the device, so Appium runs slower than
  in-process frameworks (Espresso, XCUITest).
- **Per-driver feature gaps.** Some features are XCUITest-driver
  only or UiAutomator2-driver only; cross-platform tests must
  avoid them.
- **Device-farm cost.** Real devices on cloud farms charge
  per-minute; matrix runs add up.
- **Setup complexity.** Server + drivers + Android SDK + Xcode
  command-line tools = many dependencies. Containerize where
  possible.

## References

- [app][app] - Appium overview: WebDriver protocol, driver
  architecture, supported platforms (iOS, Android, Tizen, browser,
  desktop, TV), client libraries (JS / Python / Java / Ruby /
  .NET).
- [mig3][mig3] - Appium 2 to 3 migration: Node and npm minimums,
  removed endpoints, scoped feature flags.
- [uia2][uia2] - UiAutomator2 quickstart: driver install, `appium driver
  doctor`, Android SDK prerequisites.
- [wdiosel][wdiosel] - WebdriverIO mobile selectors: accessibility ID,
  UiSelector, iOS predicate string and class chain.
- [wdiosvc][wdiosvc] - `@wdio/appium-service`: starts Appium in a child
  process; WebdriverIO 10 requires Appium 3.
- [imgplugin][imgplugin] - images plugin install and `--use-plugins`.
- `xcuitest-suite`,
  `espresso-suite` - per-platform
  native alternatives.
- `detox-testing`,
  `maestro-flows` - cross-platform
  alternatives with different trade-offs.
- `mobile-device-matrix-toolkit` - orchestrates Appium-driven matrix runs across simulators /
  emulators / farms.
