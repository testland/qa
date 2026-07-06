# qa-modern-web

Modern web reality testing: PWAs, service workers, browser extensions
(MV3), and the responsiveness Core Web Vital (INP, which replaced FID
in March 2024). Five skills covering the platform
surfaces that the bulk of e2e/UI test plugins under-cover.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [service-worker-tests](skills/service-worker-tests/SKILL.md) | Playwright `context.serviceWorkers()` patterns; cache-strategy assertions; version-bump invalidation; SW unit tests via `service-worker-mock` |
| Skill | [pwa-install-flow-tests](skills/pwa-install-flow-tests/SKILL.md) | Web App Manifest validation; `beforeinstallprompt` capture; `appinstalled` event; iOS Add-to-Home-Screen path |
| Skill | [web-vitals-inp-deep](skills/web-vitals-inp-deep/SKILL.md) | INP decomposition (input delay / processing duration / presentation delay); long-task detection; CrUX field correlation |
| Skill | [browser-extension-tests](skills/browser-extension-tests/SKILL.md) | Playwright fixtures for Chromium MV3 extensions; popup + content-script + background-SW + chrome.storage tests |
| Skill | [sw-cache-strategy-author](skills/sw-cache-strategy-author/SKILL.md) | Authors Workbox-style strategies (CacheFirst / NetworkFirst / StaleWhileRevalidate / NetworkOnly) AND the matching Playwright assertions |
| Agent | [modern-web-health-agent](agents/modern-web-health-agent.md) | Pre-deploy readiness check composing SW lifecycle gate, manifest install-gate, and INP budget assertion into one READY/NOT READY verdict |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-modern-web@testland-qa
```
