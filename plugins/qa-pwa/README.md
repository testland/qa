# qa-pwa

Workbox recipes, offline fallback patterns, web-push subscription lifecycle testing, and the single install-flow skill (reference contract + per-PWA suite builder) - distinct from qa-modern-web's generic SW/install/cache-strategy skills and qa-notifications' cross-channel push harness

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | workbox-tests | Test Workbox-built service workers - recipes, precache manifest, `workbox-window` events, `workbox-expiration` and `workbox-cacheable-response` plugin gates |
| skill | web-push-tests | Test browser web-push subscription lifecycle - `pushManager.subscribe`, VAPID JWT (ES256, aud/exp/sub per RFC 8292), `pushsubscriptionchange`, RFC 8030 410/413/429 handling, `unsubscribe()` |
| skill | service-worker-lifecycle-tests | Emit per-SW state-machine spec - `parsed → installing → installed → activating → activated → redundant`, `waitUntil`, `skipWaiting` + `Clients.claim` upgrade path |
| skill | offline-fallback-tests | Emit per-route offline test suite - walks Jake Archibald's eight cookbook recipes, layers Workbox `offlineFallback()`, pins Cache Storage / IndexedDB / Storage Manager choice |
| skill | add-to-homescreen-flow-tests | The install-flow skill: reference contract (installability gate, `beforeinstallprompt` handshake, per-platform paths, `display-mode` signal) in references/ + the per-PWA Add-to-Home-Screen suite builder with per-cell tests, iOS metadata, post-install MQ |
| agent | pwa-test-author | Author ONE Playwright spec per PWA surface - detects surface from manifest + service-worker registration, composes the matching qa-pwa skill, emits `tests/pwa-<surface>.spec.ts`; refuses on iOS Safari install-flow (no `beforeinstallprompt`) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pwa@testland-qa
```
