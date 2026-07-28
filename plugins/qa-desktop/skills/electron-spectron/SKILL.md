---
name: electron-spectron
description: "Legacy reference for Spectron - Electron's original ChromeDriver-based testing framework, officially deprecated 2022-02-01 at v19.0.0. Documents what Spectron was, the architectural reason it became unmaintainable, the migration path to Playwright `_electron`, and the residual support contract for projects still on Spectron. Use only when auditing a legacy suite or planning a migration off Spectron - for new work use Playwright's `_electron` API."
metadata:
  keywords: "electron, spectron, legacy, migration, playwright"
---

# electron-spectron

## Overview

Spectron was a Node.js library that drove Electron applications
through ChromeDriver + the legacy WebDriverIO API. It shipped from
the official `electron-userland` org and was - for several years - 
the only sanctioned end-to-end driver for Electron apps.

Per the [Spectron repository][spectronrepo]:

[spectronrepo]: https://github.com/electron-userland/spectron

> "Spectron is officially deprecated as of February 1, 2022."

The final release was **v19.0.0** (published 2022-02-02), pinned to
Electron `^19.0.0` ([spectronrepo][spectronrepo]). The repository is
archived read-only with 233 open issues and 31 unmerged pull
requests as of the deprecation snapshot ([spectronrepo][spectronrepo]).

This skill is a **pure reference**. There are no "run these
commands" steps because no new project should start on Spectron.

## When to use

- Auditing an existing Electron test suite still on Spectron.
- Estimating migration effort from Spectron to Playwright.
- Triaging Spectron test failures in projects that haven't migrated
  yet (and shouldn't migrate this sprint).
- Writing a deprecation-debt ticket - quoting the cited deprecation
  notice for stakeholder context.

For new projects: stop here and read `electron-playwright`
instead.

## Why Spectron was deprecated

The Spectron repository announcement itself does not enumerate
reasons ([spectronrepo][spectronrepo]), but the architectural
context is observable from the surrounding ecosystem at the
deprecation moment:

1. **ChromeDriver was the wrong substrate.** Electron's **main process**
   (Node.js, native modules, IPC, packaged-app lifecycle, file dialogs) sits
   outside the ChromeDriver model, so Spectron bridged it with bespoke RPC that
   grew progressively harder to keep aligned with Electron's multi-process model.
2. **The WebDriverIO sync API was retired.** Spectron's API shape depended on
   the WDIO sync API, dropped in WDIO 6+; migrating to the async API was a
   breaking change, so Spectron's surface froze.
3. **Native testing tools matured.** Per [Electron's automated-
   testing guide][electrontest], Electron now recommends three
   first-class alternatives - Playwright, WebDriverIO (modern
   async), Selenium - each with native Electron support paths.

[electrontest]: https://www.electronjs.org/docs/latest/tutorial/automated-testing

Per [Electron's official tutorial][electrontest], the three current
recommendations are:

| Tool | Approach |
|---|---|
| **Playwright** | `_electron.launch()` returns an `ElectronApp` handle; expose main-process modules via `electronApp.evaluate(...)` |
| **WebdriverIO (WDIO)** | `npm init wdio@latest ./` → wizard asks "Desktop Testing - of Electron Applications" |
| **Selenium** | WebDriver API bindings; lower-level than the above |

Playwright is the de-facto replacement most projects migrate to - 
see `electron-playwright` for the implementation
SKILL.

## What Spectron looked like

For pattern-recognition during a migration audit, a Spectron test centres on a
`new Application({ path })` handle with `app.start()` / `app.stop()` fixtures and
`app.client.<webdriver-method>` calls:

```js
// Legacy Spectron - DO NOT use for new code
const app = new Application({ path: '/path/to/MyApp' });
before(async () => { await app.start(); });
after(async () => { if (app && app.isRunning()) await app.stop(); });
it('opens a window', async () => {
  assert.strictEqual(await app.client.getWindowCount(), 1);
});
```

The before/after Playwright `_electron` equivalent and the concept-by-concept
mapping (the migration shopping list) live in
[references/spectron-migration.md](references/spectron-migration.md). See
`electron-playwright` for the full Playwright `_electron` authoring, running,
and CI workflow.

## Residual support contract

If a project must remain on Spectron in the short term:

- **Pin** `spectron: 19.0.0` (the final release per
  [spectronrepo][spectronrepo]) and `electron: ^19.0.0`. Newer
  Electron versions will break.
- **Pin Node.js** to a version compatible with the bundled
  ChromeDriver - typically Node 16 for the Spectron 19 era.
- **Do not file issues upstream** - the repository is archived
  ([spectronrepo][spectronrepo]). Patches must live as local
  forks.
- **Schedule the migration.** Spectron will not get security or
  Electron-version updates; running CI on a deprecated ChromeDriver
  in production-adjacent suites is a known-quality risk.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Starting a new Electron test project on Spectron in 2026 | Archived; no Electron 20+ support | Use `electron-playwright` |
| "Just upgrade Electron" without migrating off Spectron | Spectron pinned to Electron 19; newer Electron breaks Spectron's ChromeDriver bridge | Migrate to Playwright `_electron` |
| Big-bang Spectron → Playwright migration in one PR | High risk; no fall-back if behaviour differs | File-by-file migration with both suites green |
| Patching the archived Spectron repository upstream | Repository is read-only; PRs aren't being merged ([spectronrepo][spectronrepo]) | Fork; or invest the same effort into migration |
| Citing Spectron's deprecation as the only reason to migrate | Stakeholders ask "but it still works" | Cite (1) Electron-version lock, (2) no security updates, (3) no support - all in the deprecation notice ([spectronrepo][spectronrepo]) |

## Limitations

- **No first-party migration script.** Electron / Playwright don't
  ship a codemod for Spectron → Playwright. Migration is hand-
  ported per test file.
- **API surface drift.** Spectron's main-process RPC (`app.electron.<…>`)
  doesn't have a 1:1 mapping to Playwright's
  `electronApp.evaluate()` for every case - some tests need a
  small refactor.
- **WebDriverIO modern path** is technically also a Spectron
  successor ([electrontest][electrontest]). For projects already
  on WDIO for browser tests, `wdio-electron-service` may be a
  better migration target than Playwright `_electron`. This SKILL
  documents the Playwright path because it's the most common
  successor; WDIO path is out of scope.

## References

- Spectron repository (archived) - [spectronrepo][spectronrepo].
- Electron Automated Testing tutorial - [electrontest][electrontest].
- Successor SKILL: `electron-playwright`.
- Strategic context: `desktop-test-strategy-reference`
  describes the Electron-renderer + Electron-main two-surface
  architecture that made ChromeDriver-only drivers like Spectron
  structurally insufficient.
