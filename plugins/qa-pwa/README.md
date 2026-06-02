# qa-pwa

Workbox recipes, offline fallback patterns, Lighthouse PWA audit interpretation, and web-push subscription lifecycle testing - distinct from qa-modern-web's generic SW/install/cache-strategy skills and qa-notifications' cross-channel push harness

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | pwa-install-flow-reference | S2 | Reference for the PWA install flow as a test surface - installability gate, `beforeinstallprompt` handshake, per-platform paths, post-install `display-mode` signal |
| skill | workbox-tests | S1 | Test Workbox-built service workers - recipes, precache manifest, `workbox-window` events, `workbox-expiration` and `workbox-cacheable-response` plugin gates |
| skill | lighthouse-pwa-audit | S1 | Run and interpret Lighthouse PWA audits (`installable-manifest`, `service-worker`, `maskable-icon`, ...) - CLI, programmatic, Lighthouse CI, LHR JSON parsing despite PWA-category deprecation |
| skill | web-push-test | S1 | Test browser web-push subscription lifecycle - `pushManager.subscribe`, VAPID JWT (ES256, aud/exp/sub per RFC 8292), `pushsubscriptionchange`, RFC 8030 410/413/429 handling, `unsubscribe()` |
| skill | service-worker-lifecycle-test | S3 | Emit per-SW state-machine spec - `parsed → installing → installed → activating → activated → redundant`, `waitUntil`, `skipWaiting` + `Clients.claim` upgrade path |
| skill | offline-fallback-test | S3 | Emit per-route offline test suite - walks Jake Archibald's eight cookbook recipes, layers Workbox `offlineFallback()`, pins Cache Storage / IndexedDB / Storage Manager choice |
| skill | add-to-homescreen-flow-test | S3 | Emit per-PWA Add-to-Home-Screen suite - walks the four-stage timeline (gate → `beforeinstallprompt` → per-platform path → `display-mode` MQ), per-cell tests + iOS metadata + post-install MQ |
| agent | pwa-test-author | A2 | Author ONE Playwright spec per PWA surface - detects surface from manifest + service-worker registration, composes the matching qa-pwa skill, emits `tests/pwa-<surface>.spec.ts`; refuses on iOS Safari install-flow (no `beforeinstallprompt`) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pwa@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
