# qa-pwa

Workbox recipes, offline fallback patterns, Lighthouse PWA audit interpretation, and web-push subscription lifecycle testing - distinct from qa-modern-web's generic SW/install/cache-strategy skills and qa-notifications' cross-channel push harness

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | pwa-install-flow-reference | Reference for the PWA install flow as a test surface - installability gate, `beforeinstallprompt` handshake, per-platform paths, post-install `display-mode` signal |
| skill | workbox-tests | Test Workbox-built service workers - recipes, precache manifest, `workbox-window` events, `workbox-expiration` and `workbox-cacheable-response` plugin gates |
| skill | lighthouse-pwa-audit | Run and interpret Lighthouse PWA audits (`installable-manifest`, `service-worker`, `maskable-icon`, ...) - CLI, programmatic, Lighthouse CI, LHR JSON parsing despite PWA-category deprecation |
| skill | web-push-test | Test browser web-push subscription lifecycle - `pushManager.subscribe`, VAPID JWT (ES256, aud/exp/sub per RFC 8292), `pushsubscriptionchange`, RFC 8030 410/413/429 handling, `unsubscribe()` |
| skill | service-worker-lifecycle-test | Emit per-SW state-machine spec - `parsed → installing → installed → activating → activated → redundant`, `waitUntil`, `skipWaiting` + `Clients.claim` upgrade path |
| skill | offline-fallback-test | Emit per-route offline test suite - walks Jake Archibald's eight cookbook recipes, layers Workbox `offlineFallback()`, pins Cache Storage / IndexedDB / Storage Manager choice |
| skill | add-to-homescreen-flow-test | Emit per-PWA Add-to-Home-Screen suite - walks the four-stage timeline (gate → `beforeinstallprompt` → per-platform path → `display-mode` MQ), per-cell tests + iOS metadata + post-install MQ |
| agent | pwa-test-author | Author ONE Playwright spec per PWA surface - detects surface from manifest + service-worker registration, composes the matching qa-pwa skill, emits `tests/pwa-<surface>.spec.ts`; refuses on iOS Safari install-flow (no `beforeinstallprompt`) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pwa@testland-qa
```
