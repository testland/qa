---
component: pwa-test-author
type: agent
archetype: A2
---

# pwa-test-author - evals

Companion eval cases for [`pwa-test-author`](../../pwa-test-author.md). Three cases
covering happy path + branch + adversarial. Re-run by feeding the **Input** block as the
first user message to the agent and comparing the emitted spec file (or the agent's
refuse-to-proceed message) against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date - each eval is
designed to be re-run against each tier.

## Eval 1 - happy path - SW activation → tests/pwa-sw-activation.spec.ts + navigator.serviceWorker.ready

**Input:**

```
Author one PWA test for this target surface.

Target surface: SW lifecycle (activate event)
Behavior spec: "Given the site has registered service-worker.js at scope '/',
                when the page is loaded fresh,
                then navigator.serviceWorker.ready resolves and the active SW's
                state is 'activated'."
Project root: .

Artefacts detected:
  - manifest.webmanifest → { "name": "Demo PWA", "start_url": "/", "display": "standalone" }
  - service-worker.js (top of file): self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(clients.claim()));
  - index.html includes: navigator.serviceWorker.register('/service-worker.js');
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Identifies the SW lifecycle surface (activate event). Picks Playwright as
the runner. Emits ONE test file at `tests/pwa-sw-activation.spec.ts` that imports from
`@playwright/test`, navigates to `/`, awaits `navigator.serviceWorker.ready` via
`page.evaluate`, reads `.active.state`, and asserts `expect(state).toBe('activated')`.
Does NOT modify `service-worker.js`, `manifest.webmanifest`, or `index.html`. Does NOT
emit a Lighthouse audit invocation as a per-test assertion.

**Pass condition:** Output filename ends in `pwa-sw-activation.spec.ts` (or similar
`pwa-sw-*.spec.ts`) under `tests/`. Output contains `@playwright/test` AND
`navigator.serviceWorker.ready` AND `'activated'` AND `expect(`. Output does NOT contain
`context.setOffline` (wrong surface), `grantPermissions(['notifications']` (wrong
surface), OR edits to `service-worker.js` / `manifest.webmanifest`.

## Eval 2 - branch - offline fallback → tests/pwa-offline-fallback.spec.ts + context.setOffline(true)

**Input:**

```
Author one PWA test for this target surface.

Target surface: offline fallback page
Behavior spec: "Given the service worker has precached /offline.html,
                when the user is offline and navigates to /missing (a route that
                does not match any cached page),
                then the response body is /offline.html and the page shows an
                <h1> containing the text 'offline'."
Project root: .

Artefacts detected:
  - manifest.json → { "name": "Shop PWA", "start_url": "/", "display": "standalone" }
  - sw.js: imports workbox-precaching + workbox-routing; setCatchHandler returns matchPrecache('/offline.html').
  - index.html includes: navigator.serviceWorker.register('/sw.js');
  - tests/ directory exists with a playwright.config.ts.
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Identifies the offline fallback surface. Detects Workbox usage
(`workbox-precaching` + `workbox-routing` imports) and notes Workbox-mode in the change
summary. Emits ONE test file at `tests/pwa-offline-fallback.spec.ts` that awaits the SW
ready state, then calls `await context.setOffline(true)`, then `await page.goto('/missing')`,
then asserts an `<h1>` locator matches `/offline/i` (case-insensitive). Does NOT introduce
an SW activation assertion (wrong surface) or a `beforeinstallprompt` listener.

**Pass condition:** Output filename ends in `pwa-offline-fallback.spec.ts` (or similar
`pwa-offline-*.spec.ts`) under `tests/`. Output contains `context.setOffline(true)` AND
`page.goto(` AND `/missing` AND `toHaveText` (or `toContainText`) AND a locator on `h1`.
Output does NOT contain `beforeinstallprompt`, `grantPermissions(['notifications']`, OR
edits to `sw.js` / `manifest.json`.

## Eval 3 - adversarial - iOS Safari install-flow → refuse, recommend manual testing

**Input:**

```
Author one PWA test for this target surface.

Target surface: install-flow on iOS Safari (mobile Safari, iPhone)
Behavior spec: "Given a user on iOS Safari visits the PWA, when they tap the
                Share icon and choose 'Add to Home Screen', then the PWA
                installs and launches in standalone mode."
Project root: .

Artefacts detected:
  - manifest.webmanifest → { "name": "iOS PWA Demo", "display": "standalone" }
  - service-worker.js present, registered from index.html.
```

**Expected:** Refuses to author. Detects that the requested surface is iOS Safari
install-flow, which triggers the Refuse-to-proceed rule ("Spec asks to test install-flow
on iOS Safari → refuse. Per [web.dev install prompt], the `beforeinstallprompt` event
does not fire on iOS / iPadOS"). Explains that iOS Safari does not expose
`beforeinstallprompt`, that the install path is the Share menu, and that this is a manual
flow. Recommends manual testing or a separate WebKit-Inspector capture. Does NOT emit a
Playwright spec; does NOT emit a `beforeinstallprompt` listener.

**Target models:** sonnet (2026-05-24)

**Pass condition:** Output does NOT contain `test(` from `@playwright/test`, does NOT
contain `await page.` test code, does NOT contain a generated spec filename under
`tests/`. Output contains at least one of "Safari iOS" / "iOS Safari" /
"`beforeinstallprompt`" AND at least one of "does not fire" / "not supported" /
"manual testing" / "Share menu" / "Add to Home Screen".

## Reproducibility notes

- Inputs are concrete project-marker contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted spec file content (or, for
  Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface
  (`Write`, `Edit`, `Bash(npx playwright test *)`, `Bash(npx workbox-cli *)`,
  `Bash(npx lighthouse *)`) writes only into the project's `tests/` directory; eval
  re-runs must not modify the service worker, manifest, or existing tests.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7 sub-checks
  (≥3 cases, ≥1 adversarial, concrete pass conditions).
