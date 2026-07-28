# xctest-mac-desktop - results parsing and CI

Results parsing and the CI workflow, kept out of the SKILL spine. See
[SKILL.md](../SKILL.md) for authoring and running XCTest UI tests.

## Parsing results

The `.xcresult` bundle is queryable via `xcrun xcresulttool`:

```bash
# JSON summary of the result bundle
xcrun xcresulttool get --path build/result.xcresult --format json

# Extract a specific failure's screenshot attachment
xcrun xcresulttool get --path build/result.xcresult \
  --id <attachment-id> --output failure.png
```

For CI dashboards that expect JUnit XML, the open-source `xcresultparser`
project converts `.xcresult` -> JUnit XML; pair downstream with
`junit-xml-analysis`.

## CI integration

Hosted macOS runners on GitHub-hosted are interactive sessions, so
`XCUIApplication` launches work without extra display setup. Self-hosted headless
Mac setups need an attached console or VNC session; XCTest UI cannot run under
launchd alone.

```yaml
# .github/workflows/macos-xctest.yml
jobs:
  test:
    runs-on: macos-14   # Apple Silicon
    steps:
      - uses: actions/checkout@v5
      - uses: maxim-lobanov/setup-xcode@v1
        with: { xcode-version: '15.4' }
      - name: Build + test
        run: |
          xcodebuild test \
            -project MyApp.xcodeproj \
            -scheme MyApp \
            -destination 'platform=macOS' \
            -resultBundlePath build/result.xcresult \
            -enableCodeCoverage YES
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: xcresult
          path: build/result.xcresult
```
