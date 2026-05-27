# qa-modern-web

Modern web reality testing: PWAs, service workers, browser extensions
(MV3), and the responsiveness Core Web Vital (INP, which replaced FID
in March 2024). Five skills (4 S1 + 1 S3) covering the platform
surfaces that the bulk of e2e/UI test plugins under-cover.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [service-worker-tests](skills/service-worker-tests/SKILL.md) | S1 | Playwright `context.serviceWorkers()` patterns; cache-strategy assertions; version-bump invalidation; SW unit tests via `service-worker-mock` |
| Skill | [pwa-install-flow-tests](skills/pwa-install-flow-tests/SKILL.md) | S1 | Web App Manifest validation; `beforeinstallprompt` capture; `appinstalled` event; iOS Add-to-Home-Screen path |
| Skill | [web-vitals-inp-deep](skills/web-vitals-inp-deep/SKILL.md) | S1 | INP decomposition (input delay / processing duration / presentation delay); long-task detection; CrUX field correlation |
| Skill | [browser-extension-tests](skills/browser-extension-tests/SKILL.md) | S1 | Playwright fixtures for Chromium MV3 extensions; popup + content-script + background-SW + chrome.storage tests |
| Skill | [sw-cache-strategy-author](skills/sw-cache-strategy-author/SKILL.md) | S3 | Authors Workbox-style strategies (CacheFirst / NetworkFirst / StaleWhileRevalidate / NetworkOnly) AND the matching Playwright assertions |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-modern-web@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
