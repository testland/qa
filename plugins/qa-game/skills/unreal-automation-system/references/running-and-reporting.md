# Running and reporting

Deep reference for `unreal-automation-system` SKILL.md - how to execute the
authored tests (editor and command line), how to parse the JSON report, and how
to wire the run into CI. Consult after the tests are written.

## Session Frontend (Editor)

Per the
[Automation Test Framework documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine),
open **Window → Test Automation** (or equivalent **Session
Frontend**) inside the Editor. Tests appear as a tree keyed on
the test path (the dot-separated string from the test macro).
Click **Run Tests** for selected leaves; results show pass / fail
+ log output inline.

## Command line

Run tests from the command line by launching the editor /
commandlet with `-ExecCmds`:

```bash
UnrealEditor-Cmd.exe MyGame.uproject \
    -ExecCmds="Automation RunTests MyGame.Inventory; Quit" \
    -unattended -nopause -testexit="Automation Test Queue Empty" \
    -ReportOutputPath="artifacts/automation" \
    -log
```

Variants:

- `Automation RunTests <Filter>` - run tests matching the path
  prefix.
- `Automation RunAll` - run every registered test.
- `Automation Quit` - quit when queue drains.

On Windows the editor binary is `UnrealEditor-Cmd.exe`; on
macOS / Linux the launcher script is `UnrealEditor` with the
same flags.

## Gauntlet for build-farm runs

For full build-and-test pipelines (deploy a packaged build to a
target devkit, run automation, collect artifacts), the next
layer up is **Gauntlet** (Unreal's automation harness referenced
on the
[Automation Test Framework page](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)).
Out of scope for this skill - gauntlet wraps the same `Automation
RunTests` command-line surface internally.

## Parsing results

The `-ReportOutputPath` directory contains a JSON `index.json`
plus per-test JSON / HTML detail. Top-level shape:

```json
{
  "devices": [{
    "deviceName": "WindowsEditor",
    "instance": "WindowsEditor"
  }],
  "reportCreatedOn": "2026-05-21T10:33:00Z",
  "succeeded": 38,
  "failed": 1,
  "succeededWithWarnings": 2,
  "notRun": 0,
  "totalDuration": 142.7,
  "tests": [
    {
      "fullTestPath": "MyGame.Inventory.AddItem should increase count by the stack amount",
      "testDisplayName": "should increase count by the stack amount",
      "state": "Success",
      "entries": [/* per-step log entries */]
    },
    {
      "fullTestPath": "MyGame.Inventory.AddItem should reject items past max stack",
      "state": "Fail",
      "entries": [/* assertion failure detail */]
    }
  ]
}
```

(Field names paraphrased from observed Unreal output; the precise
schema ships with the engine version under
`Engine/Source/Runtime/AutomationController/`. For CI gating,
treat any `"state": "Fail"` as a failed build.)

There is no public common exit code; parse the JSON or scrape the
log for `LogAutomationController: Display: Test ...: Result: Fail`
lines.

## CI integration

GitHub Actions example (paraphrased from common Unreal CI
patterns; Unreal CI itself is documented inside the editor SDK):

```yaml
jobs:
  unreal-automation:
    runs-on: windows-2022
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - name: Run automation tests
        shell: pwsh
        run: |
          $UE = "C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
          & $UE "$PWD\MyGame.uproject" `
            -ExecCmds="Automation RunTests MyGame; Quit" `
            -unattended -nopause `
            -testexit="Automation Test Queue Empty" `
            -ReportOutputPath="$PWD\artifacts\automation" `
            -log
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: automation-report
          path: artifacts/automation
```

CI pipelines typically split the test run into:

- **PR job** - `EAutomationTestFlags::SmokeFilter` only
  ("complete within 1 second" per the
  [framework docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine)),
  for sub-minute PR feedback.
- **Nightly job** - `ProductFilter | StressFilter` plus screenshot
  comparison.

For a sketch of how internal QA categories
(the test-category taxonomy in `platform-cert-overview-reference`) map to
Unreal's flags, see that reference.
