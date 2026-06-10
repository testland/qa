# Frontend & web-app QA

Frontend & web-app QA role bundle: one-command install of web E2E, visual regression, accessibility, modern web, PWA, browser-extension, localization, charts, PDF/print, browser/OS compatibility, and JS/TS unit testing.

Installing this one plugin installs all 11 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-frontend-web@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-web-e2e** - Web E2E framework wrappers + cloud-grid integrations
- **qa-visual-regression** - Visual regression testing
- **qa-accessibility-specifics** - Atomic accessibility coverage
- **qa-modern-web** - Modern web testing
- **qa-pwa** - Workbox recipes, offline fallback patterns, Lighthouse PWA audit interpretation,
- **qa-browser-extension** - Firefox + Chrome extension lifecycle, MV2 to MV3 migration, host-permission
- **qa-localization** - Localization (l10n) + internationalization (i18n) testing
- **qa-charts-dataviz** - Chart + data viz testing
- **qa-pdf-print-render** - PDF + print rendering tests
- **qa-compatibility** - Browser + OS compatibility testing + self-hosted grid
- **qa-unit-tests-js** - JS/TS unit testing per-framework wrappers + orchestrator agent

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
