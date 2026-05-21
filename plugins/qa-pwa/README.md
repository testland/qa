# qa-pwa

Workbox recipes, offline fallback patterns, Lighthouse PWA audit interpretation, and web-push subscription lifecycle testing — distinct from qa-modern-web's generic SW/install/cache-strategy skills and qa-notifications' cross-channel push harness

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | pwa-install-flow-reference | S2 | Reference for the PWA install flow as a test surface — installability gate, `beforeinstallprompt` handshake, per-platform paths, post-install `display-mode` signal |
| skill | workbox-tests | S1 | Test Workbox-built service workers — recipes, precache manifest, `workbox-window` events, `workbox-expiration` and `workbox-cacheable-response` plugin gates |
| skill | lighthouse-pwa-audit | S1 | Run and interpret Lighthouse PWA audits (`installable-manifest`, `service-worker`, `maskable-icon`, ...) — CLI, programmatic, Lighthouse CI, LHR JSON parsing despite PWA-category deprecation |
| skill | web-push-test | S1 | Test browser web-push subscription lifecycle — `pushManager.subscribe`, VAPID JWT (ES256, aud/exp/sub per RFC 8292), `pushsubscriptionchange`, RFC 8030 410/413/429 handling, `unsubscribe()` |
| skill | service-worker-lifecycle-test | S3 | Emit per-SW state-machine spec — `parsed → installing → installed → activating → activated → redundant`, `waitUntil`, `skipWaiting` + `Clients.claim` upgrade path |
| skill | offline-fallback-test | S3 | Emit per-route offline test suite — walks Jake Archibald's eight cookbook recipes, layers Workbox `offlineFallback()`, pins Cache Storage / IndexedDB / Storage Manager choice |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pwa@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
