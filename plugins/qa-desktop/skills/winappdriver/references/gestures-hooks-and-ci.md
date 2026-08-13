# Appium Windows driver - gestures, hooks, and CI

Deep reference for the "Invoking via Appium" section of
[SKILL.md](../SKILL.md). Consult when adding Windows-specific gestures,
multi-window flows, PowerShell session hooks, or wiring the Appium-wrapped
driver into CI on a Windows runner.

[awd]: https://github.com/appium/appium-windows-driver

## Windows-specific gestures

Per [awd][awd], the driver adds Windows-namespaced extensions on top
of the W3C WebDriver baseline:

| Command | Purpose |
|---|---|
| `windows: scroll` | "Mouse wheel gesture" with `deltaX` / `deltaY` parameters ([awd][awd]) |
| `windows: clickAndDrag` | "Drag-and-drop operations" ([awd][awd]) |
| `windows: keys` | "Customized keyboard input with virtual key codes" ([awd][awd]) |
| `windows: launchApp` | Open another app window within the same session ([awd][awd]) |

Scroll a list inside the app under test (negative `deltaY` scrolls down):

```python
driver.execute_script('windows: scroll', {
    'elementId': list_element.id,
    'deltaY': -300,   # negative scrolls down
})
```

Drag a file across panels:

```python
driver.execute_script('windows: clickAndDrag', {
    'startElementId': source.id,
    'endElementId':   target.id,
})
```

## Multi-window sessions

Per [awd][awd], "It is possible to switch between app windows using
WebDriver Windows API" and `windows: launchApp` "creates new app
windows within the same session". This is the cross-app workflow
path (e.g., test a deep-link flow that crosses from a desktop app
into the Settings app):

```python
settings_handle = driver.execute_script('windows: launchApp', {
    'app': 'ms-settings:',
})
driver.switch_to.window(settings_handle)
```

## Pre/post-run PowerShell hooks

Per [awd][awd], `appium:prerun` and `appium:postrun` accept
PowerShell scripts that the driver executes around session
lifecycle. This is the canonical place to:

- Set up fixture data (write a config file to the user's `%AppData%`).
- Suppress / replay the Windows lock screen if the app under test
  triggers a UAC prompt.
- Tear down user-data state between tests.

```json
{
  "platformName": "windows",
  "appium:automationName": "windows",
  "appium:app": "MyApp",
  "appium:prerun": {
    "script": "Copy-Item .\\fixtures\\config.json $env:APPDATA\\MyApp\\config.json -Force"
  },
  "appium:postrun": {
    "script": "Remove-Item $env:APPDATA\\MyApp\\config.json -Force"
  }
}
```

## Run and parse results

```bash
# Pytest example
pytest tests/windows --junitxml=reports/windows-junit.xml
```

JUnit XML output feeds `junit-xml-analysis` (in the qa-test-reporting
plugin) for the cross-runner aggregation pipeline.

## CI integration

```yaml
# .github/workflows/appium-windows.yml
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm install -g appium
      - run: appium driver install windows
      - run: appium driver run windows install-wad
      - name: Enable Developer Mode
        run: |
          reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" `
            /t REG_DWORD /f /v AllowDevelopmentWithoutDevLicense /d 1
      - name: Start Appium
        run: |
          Start-Process -FilePath "appium" -ArgumentList "--port 4723" -PassThru
          Start-Sleep -Seconds 5
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install Appium-Python-Client pytest
      - run: pytest tests/windows --junitxml=reports/windows-junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: junit, path: reports/ }
```

Same hosted-vs-self-hosted runner caveats as the direct service
([SKILL.md](../SKILL.md) Limitations) - UIA requires an interactive desktop
session, so Session-0 Windows containers won't work without extra display
setup.
