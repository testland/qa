# WinAppDriver - locators, attach, and CI

Deep reference for `winappdriver` SKILL.md. Consult for the full
element-locator table, custom service bindings, attaching to an
already-running window, and CI wiring on a Windows runner.

[wad]: https://github.com/microsoft/WinAppDriver
[wadauth]: https://github.com/microsoft/WinAppDriver/blob/master/Docs/AuthoringTestScripts.md

## Custom service bindings

Per [wad][wad], beyond the default `127.0.0.1:4723`:

```cmd
:: Custom port (admin shell)
WinAppDriver.exe 4727

:: Bind to LAN IP (admin shell)
WinAppDriver.exe 10.0.0.10 4725

:: Bind to URL prefix (admin shell)
WinAppDriver.exe 10.0.0.10 4723/wd/hub
```

Custom IP / port bindings require Administrator privileges ([wad][wad]);
the default `127.0.0.1:4723` runs as a normal user.

## Element-locator strategies

Per [wadauth][wadauth]:

| C# / Java method | UIA attribute |
|---|---|
| `FindElementByAccessibilityId` | `AutomationId` |
| `FindElementByClassName` | `ClassName` |
| `FindElementById` | `RuntimeId` (decimal) |
| `FindElementByName` | `Name` |
| `FindElementByTagName` | `LocalizedControlType` |
| `FindElementByXPath` | any attribute (XPath over the UIA tree) |

To discover the right id during authoring, use **Inspect.exe** (ships
with the Windows SDK) or **Accessibility Insights for Windows** -
both walk the same UIA tree the driver sees.

## Attaching to an already-running window

For tests where the app is launched externally:

```csharp
var capabilities = new AppiumOptions();
// Hex window handle from Inspect.exe / Spy++
capabilities.AddAdditionalCapability("appTopLevelWindow", "0xB822E2");
capabilities.AddAdditionalCapability("platformName", "Windows");
var session = new WindowsDriver<WindowsElement>(
    new Uri("http://127.0.0.1:4723"),
    capabilities);
```

Per [wadauth][wadauth], the `appTopLevelWindow` capability takes a
hex window handle. This is the path for testing apps that don't
support fresh-launch (apps with single-instance locks, or apps
requiring authenticated login flows that run outside the test).

## Run

```cmd
:: Build + test (NUnit example)
dotnet test --logger "trx;LogFileName=results.trx"

:: With session retry on flaky launches
dotnet test --filter "Category=Smoke" -- RunConfiguration.TestSessionTimeout=600000
```

Tests assume `WinAppDriver.exe` is running on `127.0.0.1:4723`. A
`Setup` fixture per test class should start the driver if it isn't
already, then dispose at `TearDown`.

## Parsing results

The C# Selenium client emits standard NUnit / MSTest / xUnit results
(TRX, XML, or JUnit depending on logger choice). Pair with
`junit-xml-analysis` (in the qa-test-reporting plugin) for the
cross-runner aggregation pipeline.

## CI integration

Windows-only runner required - WinAppDriver does not run on Linux or
macOS:

```yaml
# .github/workflows/winappdriver.yml
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install WinAppDriver
        # Choco installs to default path + adds shortcut
        run: choco install winappdriver -y
      - name: Enable Developer Mode (Win 10/11 runners)
        run: |
          reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" `
            /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1
      - name: Start WinAppDriver
        run: |
          Start-Process -FilePath "C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe" `
            -PassThru
          Start-Sleep -Seconds 3   # Let the service bind to 4723
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - name: Test
        run: dotnet test --logger "trx;LogFileName=results.trx"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: trx-results
          path: '**/results.trx'
```

WinAppDriver runs **interactive** - GitHub-hosted `windows-latest`
runners have an interactive session by default, but headless self-
hosted Windows containers need additional setup (the service refuses
to start under Session 0).
