# Frontend & web-app QA

Frontend & web-app QA role bundle: one-command install of web E2E (including cross-browser matrix strategy and grids), visual regression (including chart-render testing), accessibility, PWA and service-worker testing, browser-extension, localization, PDF/print, and JS/TS unit testing.

Installing this one plugin installs all 8 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-frontend@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-web-e2e** - Web E2E framework wrappers + browser-matrix strategy, cloud grids, and self-hosted Selenium Grid 4
- **qa-visual-regression** - Visual regression testing + chart-render regression (Chart.js / D3 / Vega)
- **qa-accessibility** - Atomic accessibility coverage
- **qa-pwa** - PWA + service-worker testing: Workbox recipes, cache-strategy design, offline fallback, install flow, web push
- **qa-browser-extension** - Firefox + Chrome extension lifecycle, MV2 to MV3 migration, host-permission
- **qa-localization** - Localization (l10n) + internationalization (i18n) testing
- **qa-pdf-print** - PDF + print rendering tests
- **qa-unit-tests-js** - JS/TS unit testing per-framework wrappers + orchestrator agent

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
