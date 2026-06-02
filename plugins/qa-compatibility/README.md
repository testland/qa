# qa-compatibility

Browser and OS compatibility testing - runs the smoke suite across configured browser/OS matrices, with budget conventions for choosing which combinations to test.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [browser-matrix-runner](skills/browser-matrix-runner/SKILL.md) | S1 | Configures a CI matrix that runs the smoke / regression suite across multiple browsers per Playwright's three-engine support (Chromium, Firefox, WebKit) plus branded variants (chrome, msedge channels). Wires GitHub Actions / GitLab CI matrix syntax, captures per-browser screenshots, and aggregates per-browser pass/fail. Use when the product targets multiple browsers and the team wants automated cross-browser regression. |
| Skill | [os-matrix-runner](skills/os-matrix-runner/SKILL.md) | S1 | Configures a CI matrix that runs tests across operating systems (Linux / macOS / Windows) and runtime versions (Node 18/20/22; Python 3.10/3.11/3.12; Java 17/21; .NET 6/8). Wires GitHub Actions matrix syntax, addresses OS-specific quirks (path separators, line endings, file permissions). Use when the product ships across OS / runtime combinations and the team needs continuous cross-platform coverage. |
| Skill | [compatibility-budget](skills/compatibility-budget/SKILL.md) | S2 | Pure-reference for choosing the compatibility matrix - defines tier-1 (must work; covered per-PR) vs tier-2 (must work; covered nightly) vs tier-3 (should work; covered pre-release) vs unsupported (explicitly out of scope). Includes example budgets per product type (web / desktop / mobile / library), the matrix-size cost / coverage trade-off, and templates for documenting \"what we support\" externally. Use when a team needs to decide which browser / OS / runtime combinations to commit to. |

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
