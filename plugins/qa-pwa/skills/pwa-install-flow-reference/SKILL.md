---
name: pwa-install-flow-reference
description: "Pure reference for the PWA install flow as a test surface - the installability gate (manifest required fields per [install-criteria], registered service worker, HTTPS, ~30s user engagement), the `beforeinstallprompt` handshake (preventDefault → stash → prompt() on gesture → userChoice → appinstalled), and the `display-mode` post-install signal, with a how-to-use walkthrough and a worked Chromium install-flow assertion; per-platform paths (Android WebAPK, iOS Share menu, Firefox no-op) live in references/. Use when authoring or triaging install-flow assertions and you need the gate fields, the event contract, and the per-platform expectations in one place instead of re-reading three vendor docs."
metadata:
  keywords: "pwa, install-criteria, beforeinstallprompt, web-app-manifest, webapk"
---

# pwa-install-flow-reference

## Overview

The PWA install flow is a four-stage test surface: **installability
gate → install prompt handshake → platform-specific install path →
post-install runtime signal**. Each stage has a documented contract
the test suite can assert against. This skill is the reference the
per-stage builders (`add-to-homescreen-flow-tests`,
`web-push-tests`) and the audit reader
(`lighthouse-pwa-audit`) consult.

The body is tables + verbatim spec quotes, a how-to-use walkthrough,
and one worked Chromium assertion. Builders consume it to emit tests
without re-fetching the source pages. Per-platform divergences live in
[references/per-platform-install-paths.md](references/per-platform-install-paths.md).

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

## How to use this reference

1. **Assert the Stage 1 gate cell-by-cell.** Walk the installability-gate
   table (manifest `name` / `icons` / `start_url` / `display`, HTTPS,
   registered service worker, ~30s engagement). A single failing cell
   means `beforeinstallprompt` never fires, so localize the failure here
   before touching anything downstream.
2. **Capture `beforeinstallprompt` and stash it.** Bind the listener at
   page load, call `event.preventDefault()`, and save the deferred event
   for the app's own "Install" button (Stage 2).
3. **Drive `prompt()` from a real user gesture** and assert
   `userChoice.outcome` (`accepted` / `dismissed`), then assert the
   `appinstalled` event fired (Stage 2).
4. **Assert the installed runtime state** via the `display-mode` media
   query (`matchMedia('(display-mode: standalone)')`) - the post-install
   signal (Stage 4).
5. **Branch per platform only when needed.** Chromium desktop follows
   steps 2-4; Android Chrome, iOS Safari, and Firefox diverge - see
   [references/per-platform-install-paths.md](references/per-platform-install-paths.md).

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
`beforeinstallprompt`; Safari uses a manual flow (see the
per-platform reference).

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

The install path diverges by platform: Chromium desktop and Android
Chrome fire `beforeinstallprompt`; iOS / iPadOS Safari and desktop
Safari use a manual Share-menu flow with no event; Firefox desktop
exposes no install UI. The full per-platform table, WebAPK / Share-menu
specifics, the `apple-touch-icon` requirement, and their testing
caveats live in
[references/per-platform-install-paths.md](references/per-platform-install-paths.md).

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
  `add-to-homescreen-flow-tests`).

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

## Worked example - a Chromium install-flow assertion

A Chromium-desktop smoke that walks steps 5-12 of the timeline above -
capture the deferred event, drive `prompt()` from a gesture, assert the
`userChoice` outcome and `appinstalled`, then the Stage 4 `standalone`
signal. It uses only the event names the stages above define:

```js
test('installs and reports standalone', async ({ page }) => {
  // Stage 2: stash the deferred prompt the moment beforeinstallprompt fires.
  await page.addInitScript(() => {
    window.__deferred = null;
    window.__installed = false;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();          // suppress the mini-infobar
      window.__deferred = e;       // save for the app's Install button
    });
    window.addEventListener('appinstalled', () => { window.__installed = true; });
  });

  await page.goto('https://app.example.com');

  // Stage 1: simulate engagement; the wait only resolves once the gate passes.
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__deferred !== null);

  // Stage 2: drive prompt() from the gesture and assert the userChoice outcome.
  const outcome = await page.evaluate(async () => {
    await window.__deferred.prompt();          // callable once per event
    return (await window.__deferred.userChoice).outcome;
  });
  expect(outcome).toBe('accepted');            // 'accepted' | 'dismissed'

  // Stage 2: the browser fired appinstalled.
  await page.waitForFunction(() => window.__installed === true);

  // Stage 4: the running PWA now reports installed state.
  const standalone = await page.evaluate(
    () => matchMedia('(display-mode: standalone)').matches
  );
  expect(standalone).toBe(true);
});
```

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
- **`prefer_related_applications: true` suppresses install entirely.**
  Per [install-criteria], it gates Stage 1; tests that miss this
  field on a manifest that *also* defines a native counterpart
  will assert installability incorrectly.
- **`display-mode` MQ does not survive deep-link launches in all
  browsers.** Some launchers open the URL in the system browser
  rather than the installed PWA; the MQ then reports `browser`,
  which is correct but easy to misread as "install regressed."
- Per-platform limitations (WebAPK minting opacity, iOS Safari's
  lack of a programmatic install API) live in
  [references/per-platform-install-paths.md](references/per-platform-install-paths.md).

## References

- web.dev - Install criteria (the Stage 1 gate cells and the
  Chromium-side engagement requirement) - [install-criteria].
- web.dev - Learn PWA: Installation (per-platform install paths,
  WebAPK, iOS Share-menu flow, `apple-touch-icon` requirement) - 
  [learn-pwa].
- web.dev - Customize the install experience (Stage 2 handshake:
  `preventDefault` / `prompt()` / `userChoice` / `appinstalled`) - 
  [customize-install].
- Per-platform depth (with its own citations): Android WebAPK, iOS
  Share-menu flow, desktop Safari, Firefox no-op -
  [references/per-platform-install-paths.md](references/per-platform-install-paths.md).
- Consumed by:
  `add-to-homescreen-flow-tests`,
  `web-push-tests`,
  `lighthouse-pwa-audit`.
- Differentiation: `pwa-install-flow-tests` authors the install-flow
  *Playwright tests*; this skill is the
  reference shape those tests consume. Read this first when
  triaging a flaky install assertion.
