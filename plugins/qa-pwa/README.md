# qa-pwa

Workbox recipes, offline fallback patterns, Lighthouse PWA audit interpretation, and web-push subscription lifecycle testing — distinct from qa-modern-web's generic SW/install/cache-strategy skills and qa-notifications' cross-channel push harness

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | pwa-install-flow-reference | S2 | Reference for the PWA install flow as a test surface — installability gate, `beforeinstallprompt` handshake, per-platform paths, post-install `display-mode` signal |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pwa@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
