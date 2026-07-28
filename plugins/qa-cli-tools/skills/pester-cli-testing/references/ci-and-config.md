# Pester CI and configuration reference

Longer CI pipeline definitions and the `PesterConfiguration` property lookup.
The core in-spine examples live in SKILL.md Steps 8 - 10; this file holds the
full CI YAML and the property table.

## Key `Run` properties

Per the [configuration docs](https://pester.dev/docs/usage/configuration):

| Property | Default | Purpose |
|----------|---------|---------|
| `Run.Path` | `'.'` | Directory or file(s) to discover |
| `Run.ExcludePath` | (none) | Paths to skip |
| `Run.Exit` | `$false` | Non-zero exit on failure |
| `Run.TestExtension` | `'.Tests.ps1'` | File filter for discovery |

## GitHub Actions (cross-platform matrix)

One matrix job covers all three GitHub-hosted runners via `pwsh` (PowerShell
7+). On Windows runners `-SkipPublisherCheck` overrides the bundled Pester's
publisher certificate; it is a harmless no-op on Linux/macOS, where no bundled
version exists to conflict with.

```yaml
jobs:
  pester:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - name: Install Pester
        shell: pwsh
        run: Install-Module -Name Pester -Force -SkipPublisherCheck
      - name: Run tests
        shell: pwsh
        run: |
          $config = New-PesterConfiguration
          $config.Run.Path               = '.\tests'
          $config.Run.Exit               = $true
          $config.TestResult.Enabled     = $true
          $config.TestResult.OutputFormat = 'NUnitXml'
          $config.TestResult.OutputPath  = 'testResults.xml'
          $config.CodeCoverage.Enabled   = $true
          $config.CodeCoverage.Path      = '.\src'
          $config.CodeCoverage.CoveragePercentTarget = 75
          Invoke-Pester -Configuration $config
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pester-results
          path: |
            testResults.xml
            coverage.xml
```

## Azure DevOps

Per the [test-results docs](https://pester.dev/docs/usage/test-results), after
running Pester with `NUnitXml` output, add a Publish Test Results task with the
NUnit format:

```yaml
- task: PublishTestResults@2
  inputs:
    testResultsFormat: NUnit
    testResultsFiles: testResults.xml
```
