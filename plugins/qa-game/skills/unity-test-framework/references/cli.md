# UTF command-line (batch mode) - reference

Batch-mode flags and the exit-code caveat for unity-test-framework, per the
[command-line reference](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html).

## Flags

| Flag | Effect |
|---|---|
| `-runTests` | "Executes tests within the project." |
| `-batchmode` | "Removes the need for manual user inputs when running tests from the command line." |
| `-projectPath <path>` | Project root. |
| `-testResults <path>` | "Designates where Unity stores the result file (XML format per NUnit standards). If unspecified, results are saved in the project root." |
| `-testPlatform EditMode\|PlayMode\|<BuildTarget>` | "Default: EditMode if not specified." `BuildTarget` (e.g. `StandaloneWindows64`, `Android`) runs tests on a built player for that platform. |
| `-testFilter "Pattern"` | "Accepts a semicolon-separated list or regex pattern to match test names. Supports negation with `!`." |
| `-testCategory "Smoke;Critical"` | "Accepts a semicolon-separated list or regex pattern for category matching. Also supports negation with `!`." |
| `-assemblyNames "MyGame.Tests.PlayMode"` | Limit to specific test assemblies. |
| `-runSynchronously` | Run on the main thread synchronously (EditMode only). |
| `-orderedTestListFile`, `-randomOrderSeed`, `-retry`, `-repeat`, `-playerHeartbeatTimeout`, `-testSettingsFile` | "Control test execution order, failure handling, timing, and settings configuration" per the same page. |

## Full example (Linux / macOS)

```bash
Unity \
  -batchmode \
  -projectPath "$PWD" \
  -runTests \
  -testPlatform PlayMode \
  -testResults artifacts/playmode-results.xml \
  -testCategory "Smoke" \
  -logFile artifacts/unity.log
```

Windows equivalent: invoke
`"C:\Program Files\Unity\Hub\Editor\<version>\Editor\Unity.exe"`
with the same flags.

## Exit-code caveat

Per the command-line reference: "There is currently no common definition for
exit codes reported by individual Unity components under test. Error messages
and stack traces in results provide better diagnostic information." Treat the
produced `-testResults` XML as the source of truth in CI rather than the
process exit code.
