# UTF result parsing and CI - reference

NUnit 3 result format and CI wiring for unity-test-framework.

## NUnit 3 result XML

The XML written to `-testResults <path>` is **NUnit 3 result format**. The CI
pipeline must parse it to surface failures. Top-level structure:

```xml
<test-run id="2" testcasecount="42" result="Failed" total="42"
          passed="40" failed="1" inconclusive="0" skipped="1">
  <test-suite ...>
    <test-case fullname="MyGame.Tests.HealthTests.Damage_DeductsCorrectAmount"
               result="Passed" duration="0.012"/>
    <test-case fullname="MyGame.Tests.EnemyAITests.Enemy_PursuesPlayer_WithinRange"
               result="Failed" duration="2.34">
      <failure>
        <message><![CDATA[Enemy did not close on player]]></message>
        <stack-trace><![CDATA[at MyGame.Tests.EnemyAITests...]]></stack-trace>
      </failure>
    </test-case>
  </test-suite>
</test-run>
```

Surface `result="Failed"` at the `<test-run>` level for the overall pass /
fail, then enumerate `<test-case result="Failed">` for per-test detail. The
schema is NUnit-canonical - `nunit-junit-xml` converters exist for tools that
expect JUnit XML.

## GitHub Actions

Using `game-ci/unity-test-runner`:

```yaml
jobs:
  unity-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - uses: actions/cache@v4
        with:
          path: Library
          key: Library-${{ github.sha }}
          restore-keys: Library-
      - uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with:
          testMode: all  # editmode + playmode
          artifactsPath: artifacts
          coverageOptions: "generateAdditionalMetrics;generateHtmlReport"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unity-test-results
          path: artifacts/**/*.xml
```

Cache the `Library/` folder across runs - Unity re-imports all assets without
it, adding 5 - 15 min per CI run. The bare-CLI equivalent invokes Unity
directly with the flags in [cli.md](cli.md) and treats the `-testResults` XML
as the source of truth.
