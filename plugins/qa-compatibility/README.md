# qa-compatibility

Browser and OS compatibility testing - runs the smoke suite across configured browser/OS matrices, with budget conventions for choosing which combinations to test.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [browser-matrix-runner](skills/browser-matrix-runner/SKILL.md) | Configures a CI matrix that runs the smoke / regression suite across multiple browsers per Playwright's three-engine support (Chromium, F... |
| Skill | [browser-matrix-strategy-reference](skills/browser-matrix-strategy-reference/SKILL.md) | Pure-reference catalog for designing a browser / OS / device test matrix. |
| Skill | [compatibility-budget](skills/compatibility-budget/SKILL.md) | Pure-reference for choosing the compatibility matrix - defines tier-1 (must work; covered per-PR) vs tier-2 (must work; covered nightly)... |
| Skill | [os-matrix-runner](skills/os-matrix-runner/SKILL.md) | Configures a CI matrix that runs tests across operating systems (Linux / macOS / Windows) and runtime versions (Node 18/20/22; Python 3.1... |
| Skill | [selenium-grid-4-runner](skills/selenium-grid-4-runner/SKILL.md) | Author and operate Selenium Grid 4 - self-hosted distributed WebDriver. |
| Agent | [compatibility-matrix-auditor](agents/compatibility-matrix-auditor.md) | Adversarial auditor that reads an existing browser/OS support matrix and checks it against the plugin's T1/T2/T3 tier conventions and bud... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-compatibility@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
