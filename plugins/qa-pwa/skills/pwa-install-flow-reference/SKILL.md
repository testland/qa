---
name: pwa-install-flow-reference
description: "Pure reference for the PWA install flow as a test surface - the installability gate (manifest required fields per [web.dev/articles/install-criteria][install-criteria], registered service worker, HTTPS, ~30s user engagement), the `beforeinstallprompt` event handshake (preventDefault → stash → prompt() on gesture → userChoice → appinstalled), the per-platform divergences (Chromium desktop install badge, Android WebAPK minting, iOS manual Share → Add to Home Screen), and the `display-mode` media-query post-install signal. For generic service-worker tests, install-flow tests, and SW cache-strategy authoring see `qa-modern-web/service-worker-tests`, `pwa-install-flow-tests`, and `sw-cache-strategy-author`. For channel-agnostic push-notification harness see `qa-notifications/push-notification-test-author`. This plugin covers Workbox recipes, offline-fallback patterns, Lighthouse PWA audit interpretation, and web-push subscription lifecycle."
keywords:
  - pwa
  - install-criteria
  - beforeinstallprompt
  - web-app-manifest
  - webapk
---

# pwa-install-flow-reference

## Overview

The PWA install flow is a four-stage test surface: **installability
gate → install prompt handshake → platform-specific install path →
post-install runtime signal**. Each stage has a documented contract
the test suite can assert against. This skill is the reference the
per-stage builders ([`add-to-homescreen-flow-test`](../add-to-homescreen-flow-test/SKILL.md),
[`web-push-test`](../web-push-test/SKILL.md)) and the audit reader
([`lighthouse-pwa-audit`](../lighthouse-pwa-audit/SKILL.md)) consult.

This is a **pure reference** - no execution steps. The body is
tables + verbatim spec quotes. Builders consume it to emit tests
without re-fetching the source pages.

[install-criteria]: https://web.dev/articles/install-criteria
[learn-pwa]: https://web.dev/learn/pwa/installation
[customize-install]: https://web.dev/articles/customize-install

## When to use

- Bootstrapping a PWA test plan and need the gate fields up-front
  before writing a single assertion.
- A `beforeinstallprompt` test is flaking - consult the contract to
  separate "gate not met" from "test setup wrong".
- A team wants per-platform expectations (Chromium vs iOS Safari vs
  Android Chrome vs Edge) without re-reading three vendor docs.
- An auditor (PR reviewer, accessibility reviewer) needs a
  one-screen summary of what "installable" actually means.

## Stage 1 - Installability gate

Per [install-criteria], a page becomes installable on Chromium when
every cell below is satisfied. Failures are silent: the
`beforeinstallprompt` event simply never fires. Tests must assert
each cell independently to localize gate failures.

| Cell | Requirement | Source |
|---|---|---|
| Manifest name | `"short_name" or "name"` present | [install-criteria] |
| Manifest icons | `"icons"` array must include both 192px and 512px icons | [install-criteria] |
| Manifest start | `"start_url"` present | [install-criteria] |
| Manifest display | `"display"` must be `fullscreen`, `standalone`, `minimal-ui`, or `window-controls-overlay` | [install-criteria] |
| Manifest related-apps gate | `"prefer_related_applications"` must not be present or be `false` | [install-criteria] |
| Transport | "Be served over HTTPS" | [install-criteria] |
| User engagement | "Users must click/tap the page at least once and spend minimum 30 seconds viewing it" | [install-criteria] |
| Not pre-installed | "The web app is not already installed" | [install-criteria] |

Per [install-criteria], when every cell passes "Chrome fires the
`beforeinstallprompt` event and displays an install promotion in
the browser UI (address bar button or overflow menu)."

Per [learn-pwa]: *"As a minimum requirement for installability,
most browsers that support it use the Web App Manifest file and
certain properties such as the name of the app, and configuration
of the installed experience."* Edge, Samsung Internet, and Opera
follow the Chromium criteria; Firefox desktop does not implement
`beforeinstallprompt`; Safari uses a manual flow (Stage 3 below).

## Stage 2 - The `beforeinstallprompt` handshake

Per [customize-install], the canonical four-call lifecycle:

| Call | Purpose | Source |
|---|---|---|
| `event.preventDefault()` | "Prevent the mini-infobar from appearing on mobile" | [customize-install] |
| Stash `event` reference | Save the deferred prompt for the app's own "Install" button | [customize-install] |
| `event.prompt()` | Show the prompt; must be called from a user-gesture handler. "You can only call `prompt()` on the deferred event once" per [customize-install] | [customize-install] |
| `await event.userChoice` | Resolves to `{ outcome: 'accepted' \| 'dismissed' }` per [customize-install] | [customize-install] |
| `appinstalled` event | Fires "whenever installation succeeds, regardless of the trigger mechanism" per [customize-install] - covers both custom-button installs and browser-driven installs | [customize-install] |

The `BeforeInstallPromptEvent` instance also exposes a `platforms`
property - the array of install targets the browser would offer
(typically `['web']` on desktop Chromium); tests can assert against
this to detect WebView vs full Chromium environments.

## Stage 3 - Per-platform install path

The install path itself diverges by platform. Tests must branch:

| Platform | Path | Trigger | Test posture |
|---|---|---|---|
| Chromium desktop (Chrome, Edge, Brave) | Install badge in URL bar; "Install" item in overflow menu | `beforeinstallprompt` fires when Stage 1 passes | Drive `prompt()` from a user-gesture click; assert `userChoice.outcome` and `appinstalled` |
| Android Chrome | WebAPK minting (a real APK signed by Google Play services and registered with the launcher) per [learn-pwa] | `beforeinstallprompt` fires; user accepts via mini-infobar or app-driven prompt | Smoke on a real device farm; Playwright on Android Chrome works for the prompt itself but cannot assert WebAPK minting completion |
| Android Chrome (alternate) | Shortcuts or QuickApp formats per [learn-pwa] | Same as WebAPK path | WebAPK is the canonical path; shortcut path is a fallback |
| iOS / iPadOS Safari | "Open the Share menu... Click Add to Home Screen... Confirm the name of the app... Click Add" per [learn-pwa] | Manual user gesture only; no `beforeinstallprompt` event | Test the metadata (`apple-touch-icon`, `apple-mobile-web-app-capable` meta) statically; assert installed runtime via `display-mode` MQ (Stage 4); the actual install step is manual smoke |
| Desktop Safari | App-driven install on macOS Sonoma+ via the "Add to Dock" Share menu | Manual user gesture only | Same posture as iOS - static metadata + post-install MQ |
| Firefox desktop | Install UI not exposed | n/a | No `beforeinstallprompt`; no install assertion path |

Per [learn-pwa]: iOS install "requires `apple-touch-icon` tag" - a
test that omits this assertion misses a class of icon-missing
install regressions that are otherwise invisible until a user
files a bug.

## Stage 4 - Post-install runtime signal

After install, the running PWA can detect its installed state via
the `display-mode` media query. The query matches `standalone`,
`minimal-ui`, `fullscreen`, or `window-controls-overlay` per the
manifest's `display` field - the same values Stage 1 enumerates.

Tests use this signal to:

- Hide the in-app "Install" button (the prompt won't fire when
  already installed per Stage 1's "Not pre-installed" cell).
- Branch analytics: a session in `display-mode: standalone` is a
  PWA-launch session.
- Assert that a `--app=` launched Chromium instance reports
  `standalone` (a common test pattern; see
  [`add-to-homescreen-flow-test`](../add-to-homescreen-flow-test/SKILL.md)).

The signal can be polled (`matchMedia('(display-mode: standalone)').matches`)
or observed (`mql.addEventListener('change', ...)`); both are
fair-game in tests.

## The full event timeline

For a single user who installs and launches the PWA, the event
sequence is:

```
1. Page loads.                                  (page load)
2. Service worker registers.                    (Stage 1 prerequisite)
3. User engagement reaches the threshold.       (Stage 1 prerequisite)
4. Manifest gate passes.                        (Stage 1)
5. browser fires beforeinstallprompt.           (Stage 2)
6. App calls event.preventDefault() + stashes.  (Stage 2)
7. User clicks the app's "Install" button.      (Stage 2 - user gesture)
8. App calls stashedEvent.prompt().             (Stage 2)
9. User accepts → userChoice resolves accepted. (Stage 2)
10. Browser installs (WebAPK / shortcut / desktop bundle).  (Stage 3)
11. Browser fires appinstalled.                 (Stage 2)
12. Next session: PWA launches in display-mode standalone.  (Stage 4)
```

A test plan covers each step with an assertion or a documented gap
("step 10 not assertable in headless").

## Common test-setup anti-patterns

| Anti-pattern | Why it fails | Pointer to better posture |
|---|---|---|
| Calling `prompt()` without user gesture | Browser blocks; Stage 2 contract violated per [customize-install] | Always tie to a user click handler |
| Calling `prompt()` twice on the same event | "You can only call `prompt()` on the deferred event once" per [customize-install] | Re-bind a fresh `beforeinstallprompt` listener for the next install attempt |
| Asserting installability without 30s+ engagement | Stage 1 user-engagement cell fails silently per [install-criteria] | Page-load Playwright tests must simulate engagement (scroll, click) before asserting `beforeinstallprompt` |
| Asserting `appinstalled` then immediately closing the page | The event may fire post-close; race on visibility | Bind the listener at page load, not at click-time |
| Treating iOS the same as Chromium | Stage 2 doesn't apply on Safari; the install path is manual per [learn-pwa] | Branch test paths on `userAgent` or test plan; assert metadata + `display-mode` only |
| Manifest in subdirectory without `scope` | `start_url` outside `scope` invalidates the manifest gate | Set `scope` to the parent path of `start_url` |

## Limitations

- **The 30-second engagement timer is browser-internal.** Tests
  cannot directly query the timer; they can only assert that
  `beforeinstallprompt` *did* fire after sufficient engagement,
  not the precise threshold.
- **WebAPK minting completion is opaque.** Per [learn-pwa] Android
  Chrome mints a WebAPK on install, but the test surface ends at
  `appinstalled` - the minting is a background-service-worker
  operation, not a DOM-observable event.
- **iOS Safari has no programmatic install API.** Stage 3 iOS
  cells must be tested with manual smoke or device-farm Appium
  drivers; no headless path exists.
- **`prefer_related_applications: true` suppresses install entirely.**
  Per [install-criteria], it gates Stage 1; tests that miss this
  field on a manifest that *also* defines a native counterpart
  will assert installability incorrectly.
- **`display-mode` MQ does not survive deep-link launches in all
  browsers.** Some launchers open the URL in the system browser
  rather than the installed PWA; the MQ then reports `browser`,
  which is correct but easy to misread as "install regressed."

## References

- web.dev - Install criteria (the Stage 1 gate cells and the
  Chromium-side engagement requirement) - [install-criteria].
- web.dev - Learn PWA: Installation (per-platform install paths,
  WebAPK, iOS Share-menu flow, `apple-touch-icon` requirement) - 
  [learn-pwa].
- web.dev - Customize the install experience (Stage 2 handshake:
  `preventDefault` / `prompt()` / `userChoice` / `appinstalled`) - 
  [customize-install].
- Consumed by:
  [`add-to-homescreen-flow-test`](../add-to-homescreen-flow-test/SKILL.md),
  [`web-push-test`](../web-push-test/SKILL.md),
  [`lighthouse-pwa-audit`](../lighthouse-pwa-audit/SKILL.md).
- Differentiation: `pwa-install-flow-tests` (in the qa-modern-web
  plugin) authors the install-flow *Playwright tests*; this skill is the
  reference shape those tests consume. Read this first when
  triaging a flaky install assertion.
