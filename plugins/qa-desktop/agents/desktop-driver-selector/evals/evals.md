---
component: desktop-driver-selector
type: agent
archetype: A2
---

# desktop-driver-selector - evals

Companion eval cases for [`desktop-driver-selector`](desktop-driver-selector.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding
the **Input** block as the first user message to the agent and comparing
the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date - 
the eval cases are designed to be re-run by a reviewer against each tier.

## Eval 1 - happy path - WPF csproj → FlaUI

**Input:**

```
Recommend a desktop UI driver for this project. csproj path:
C:\repos\InvoiceApp\src\InvoiceApp.csproj

File contents:
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23), opus (2026-05-23)

**Expected:** Detects `wpf` app type from `<UseWPF>true</UseWPF>` + `net8.0-windows`. Recommends FlaUI (UIA3). Cites the FlaUI README rationale (.NET-native, idiomatic). Names the read-next skill as `flaui-tests`. Includes a "Conditions under which this flips" section naming the non-.NET-client trigger.

**Pass condition:** Output contains the literal strings `FlaUI`, `UIA3` (or `flaui-tests`), AND `wpf` (case-insensitive). Output does NOT recommend `WinAppDriver` as the primary driver. Output contains a "Conditions" or "flips" section header.

## Eval 2 - branch - Electron package.json → electron-playwright

**Input:**

```
Recommend a desktop UI driver for this project. package.json contents:
{
  "name": "screenshot-tool",
  "version": "1.4.0",
  "main": "main.js",
  "scripts": { "start": "electron ." },
  "devDependencies": {
    "electron": "^30.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

**Target models:** sonnet (2026-05-23), haiku (2026-05-23)

**Expected:** Detects `electron` app type from `"electron"` in devDependencies. Recommends `electron-playwright`. Cites that Electron's UI tree is rendered by Chromium (so UIA-based drivers like FlaUI / WinAppDriver are wrong). Names `electron-playwright` as the read-next skill. Does NOT recommend FlaUI or WinAppDriver.

**Pass condition:** Output contains the literal string `electron-playwright`. Output does NOT recommend `FlaUI` or `WinAppDriver` as the primary driver. Output contains the word `Chromium` OR `_electron` (rationale evidence).

## Eval 3 - adversarial - empty repo / README only → refuse to recommend

**Input:**

```
Recommend a desktop UI driver for this project. Repository contents:
- README.md (one paragraph: "An app for managing invoices.")
- LICENSE
- .gitignore

No csproj, no package.json, no *.pro, no CMakeLists.txt, no Xcode project.
```

**Target models:** sonnet (2026-05-23)

**Expected:** Refuses to recommend a driver. Asks the user to provide either a project file path (csproj / package.json / pro / CMakeLists / xcodeproj) OR an explicit app-type declaration (`wpf` / `electron` / etc.). Does NOT guess from the README's free-form prose ("invoices" → "probably WPF").

**Pass condition:** Output does NOT contain a "Recommended driver:" line with a concrete driver name. Output contains either "refuse" / "cannot recommend" / "need" / "provide" / "missing" (any one - the agent surfaces the refuse-to-proceed message). Output asks for a project file path OR an explicit app-type declaration.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks; a reviewer can grep the agent's transcript output.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash`) is read-only - eval re-runs do not modify the test repository.
- Eval cases were authored 2026-05-23 against the v3.0 framework's D7 sub-checks.
