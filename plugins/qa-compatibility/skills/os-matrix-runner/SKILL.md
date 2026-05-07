---
name: os-matrix-runner
description: "Configures a CI matrix that runs tests across operating systems (Linux / macOS / Windows) and runtime versions (Node 18/20/22; Python 3.10/3.11/3.12; Java 17/21; .NET 6/8). Wires GitHub Actions matrix syntax, addresses OS-specific quirks (path separators, line endings, file permissions). Use when the product ships across OS / runtime combinations and the team needs continuous cross-platform coverage."
rating: 22
d6: 3
archetype: S1
---

# os-matrix-runner

## Overview

OS / runtime matrices catch a class of bugs that single-OS testing
misses:

- **Path separators:** `\` vs `/`.
- **Line endings:** CRLF vs LF.
- **File permissions:** POSIX modes vs Windows ACLs.
- **Case sensitivity:** Linux ext4 case-sensitive; macOS HFS+
  case-insensitive by default; Windows NTFS case-insensitive.
- **Runtime version differences:** Node 18 vs 22 has new APIs;
  Python 3.12 deprecates patterns from 3.10.
- **Shell behavior:** bash vs zsh vs PowerShell.

The matrix is the systematic counter to "works on my machine."

## When to use

- The product runs on multiple OSes (CLI tools, libraries,
  desktop apps).
- The team supports multiple runtime versions.
- A bug report says "works on Linux, broken on Windows."

For browsers specifically, see [`browser-matrix-runner`](../browser-matrix-runner/SKILL.md).

## Step 1 — Define the OS matrix

```yaml
# .github/workflows/os-matrix.yml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
```

GitHub Actions provides:

| Runner            | Use                                       |
|-------------------|-------------------------------------------|
| `ubuntu-latest`   | Default; cheapest; most CI runs here.     |
| `ubuntu-22.04`    | Pin specific Ubuntu LTS.                   |
| `macos-latest`    | macOS; needed for iOS / Safari testing.   |
| `macos-15`        | Pin macOS version.                         |
| `windows-latest`  | Windows; tests Windows-specific paths.    |
| `windows-2022`    | Pin Windows version.                       |

## Step 2 — Define the runtime matrix

Per language:

```yaml
# Node.js
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, macos-latest, windows-latest]
```

```yaml
# Python
strategy:
  matrix:
    python: ['3.10', '3.11', '3.12']
    os: [ubuntu-latest, macos-latest, windows-latest]
```

```yaml
# Java
strategy:
  matrix:
    java: [17, 21]
    os: [ubuntu-latest, macos-latest, windows-latest]
```

```yaml
# .NET
strategy:
  matrix:
    dotnet: ['6.0.x', '8.0.x']
    os: [ubuntu-latest, macos-latest, windows-latest]
```

The full cross-product is 3 OSes × 3 runtimes = 9 jobs. For
larger matrices, use `include` + `exclude` to skip uninteresting
combinations.

## Step 3 — Address OS-specific quirks

### Path separators

```javascript
// Bad — hardcoded /
const configPath = projectRoot + '/config/app.json';

// Good — path.join
const path = require('node:path');
const configPath = path.join(projectRoot, 'config', 'app.json');
```

### Line endings

```bash
# .gitattributes
*.sh text eol=lf
*.bat text eol=crlf
*.json text
```

Without `.gitattributes`, Windows users may commit CRLF; tests
that compare output strings break.

### Case sensitivity

```javascript
// On Linux: import './Utils' fails if file is './utils'
// On macOS / Windows (default): both work

// Always match file case exactly:
import { foo } from './utils';   // matches utils.js
```

### Shell

```yaml
- name: Run script (cross-platform)
  shell: bash
  run: ./scripts/setup.sh
```

`shell: bash` works on Linux + macOS + Windows (via Git Bash on
Windows runners).

## Step 4 — Per-OS conditional steps

When OS-specific setup is needed:

```yaml
- name: Install Linux deps
  if: runner.os == 'Linux'
  run: sudo apt-get install -y libssl-dev

- name: Install macOS deps
  if: runner.os == 'macOS'
  run: brew install openssl

- name: Install Windows deps
  if: runner.os == 'Windows'
  run: choco install openssl
```

## Step 5 — Aggregate per-OS results

```markdown
## OS / runtime matrix results — `<sha>`

| OS        | Runtime  | Tests | Pass | Fail | Time |
|-----------|----------|------:|-----:|-----:|-----:|
| Linux     | Node 22  |  142  |  142 |    0 | 2m   |
| Linux     | Node 20  |  142  |  142 |    0 | 2m   |
| Linux     | Node 18  |  142  |  140 |    2 | 2m   |  ← Node 18 incompat
| macOS     | Node 22  |  142  |  141 |    1 | 3m   |  ← macOS path issue
| macOS     | Node 20  |  142  |  141 |    1 | 3m   |
| Windows   | Node 22  |  142  |  140 |    2 | 4m   |  ← Windows path issue
| ...
```

## Step 6 — Per-OS conditional tests

Some tests are OS-specific:

```javascript
// jest.config.js
module.exports = {
  testPathIgnorePatterns: process.platform === 'win32'
    ? ['unix-only.test.js']
    : ['windows-only.test.js'],
};
```

Or via test framework conditionals:

```javascript
test.skipIf(process.platform === 'win32')('uses fork()', () => {
  // POSIX-specific test
});
```

## Step 7 — Cost management

Matrix size grows multiplicatively. Manage cost:

| Tier              | Cadence            | Matrix size                                 |
|-------------------|--------------------|----------------------------------------------|
| Per-PR (smoke)    | Per push            | 1 × 1 = 1 job (Linux + latest runtime).     |
| Per-merge to main | Per merge           | 3 × 1 = 3 jobs (3 OSes + latest runtime).   |
| Nightly            | Cron                | 3 × 3 = 9 jobs (full matrix).               |
| Pre-release        | Tag                 | Full matrix + extra exotic combinations.    |

The "smoke matrix" per-PR keeps CI cheap; the full matrix runs
less frequently.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hardcoded `/` path separators                                          | Breaks on Windows.                                                        | `path.join` (Step 3). |
| `fail-fast: true` on the matrix                                        | One OS fails; can't see others.                                           | `fail-fast: false`. |
| Same matrix every commit                                               | CI cost explodes; team disables.                                          | Tiered cadence (Step 7). |
| Per-OS code in production                                              | If/else by OS; high maintenance.                                          | Cross-platform abstractions in production; OS-specific code in glue layer only. |
| Skipping `.gitattributes`                                                | CRLF / LF mixing; tests fail mysteriously.                               | Always set (Step 3). |

## Limitations

- **GitHub Actions runner cost.** Windows + macOS runners are
  more expensive than Linux; matrix design tradeoff.
- **Per-OS bugs may surface only at runtime.** Static analysis
  catches some; integration tests are the safety net.
- **macOS-specific issues** often only reproduce on real macOS;
  Linux CI doesn't catch them.
- **Older OS versions** rarely available on hosted runners; need
  self-hosted for legacy.

## References

- GitHub Actions runners docs at `docs.github.com/en/actions/using-github-hosted-runners`.
- [`browser-matrix-runner`](../browser-matrix-runner/SKILL.md) —
  sibling: browser-specific.
- [`compatibility-budget`](../compatibility-budget/SKILL.md) —
  conventions for matrix sizing.
