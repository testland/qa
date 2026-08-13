---
name: add-to-homescreen-flow-tests
description: "The single install-flow skill: the reference contract for the PWA install flow (installability gate fields, `beforeinstallprompt` handshake, per-platform paths - Android WebAPK / iOS Share menu / Firefox no-op - and the `display-mode` post-install signal, in references/install-flow-reference.md) plus the build-an-X workflow that emits the Add-to-Home-Screen suite. Walks the four-stage timeline, emitting one test per gate cell per [web.dev/articles/install-criteria][install-criteria], the deferred-prompt → `prompt()` → `userChoice` chain per [web.dev/articles/customize-install][customize-install], the iOS Safari manual-metadata branch (`apple-touch-icon`) per [web.dev/learn/pwa/installation][learn-pwa], and the post-install `(display-mode: standalone)` MQ assertion. Output: a Playwright spec with per-stage cells plus a coverage matrix. Use when a PWA's manifest, icons, or install handler change, when install conversion drops at an unknown stage, or when triaging a flaky install assertion."
metadata:
  keywords: "add-to-homescreen, beforeinstallprompt, appinstalled, display-mode, apple-touch-icon"
---

# add-to-homescreen-flow-tests

## Overview

The PWA install flow is a four-stage test surface per
[references/install-flow-reference.md](references/install-flow-reference.md):
installability gate → `beforeinstallprompt` handshake → per-platform
install path → post-install `display-mode` signal. Every team's
install regression looks slightly different - a missing `start_url`,
an icon resolution drift, a `prompt()` called without a user
gesture - but the test surface is the same.

This builder produces the per-PWA install suite. Output is a
Playwright spec file plus a coverage YAML matrix mapping each
install criterion from [install-criteria] to its assertion.
The contract itself - gate cells, event lifecycle, per-platform
paths, and the full event timeline - lives in
[references/install-flow-reference.md](references/install-flow-reference.md);
the workflow consumes it by emitting verification cells.

[install-criteria]: https://web.dev/articles/install-criteria
[learn-pwa]: https://web.dev/learn/pwa/installation
[customize-install]: https://web.dev/articles/customize-install

Distinct from `pwa-install-flow-tests` (in the qa-modern-web plugin):
that skill authors install-flow tests as a generic wrapper.
This builder generates the *per-PWA* suite from the project's
actual manifest + SW + page handler - the artifact you check into
the repo, not the pattern reference.

Composes with:

- [references/install-flow-reference.md](references/install-flow-reference.md) - the four-stage timeline this builder follows step-by-step.
- `service-worker-lifecycle-tests` - Stage 1 of the install gate requires an active SW; pair this
  builder's output with the lifecycle spec for full coverage.

## When to use

- New PWA, pre-launch - generate the install suite alongside the
  manifest.
- Manifest changed (renamed `name`, new icon, dropped `display`
  field) - re-run the builder to catch criteria regressions.
- Install conversion is dropping in analytics - author the
  per-stage cells to localize where users fall out (gate fails →
  prompt never fires; prompt fires → user dismisses; install
  succeeds but `display-mode` flips wrong).
- Adding iOS support to a Chromium-first PWA - author the manual-
  metadata branch.

## Workflow

### Step 1 - Read the manifest + page handler

```bash
# Inventory
cat public/manifest.webmanifest > tests/install-snapshot/manifest.json
grep -E "beforeinstallprompt|appinstalled" src/ -rn > tests/install-snapshot/handlers.txt
```

Capture for the test:

| Fact | Used in |
|---|---|
| Manifest fields (`name`, `short_name`, `display`, `start_url`, icons sizes) | Step 2 |
| Whether the page binds `beforeinstallprompt` | Step 3 |
| The selector of the in-app "Install" button | Step 3 |
| Whether `appinstalled` is bound (analytics) | Step 4 |
| Whether `apple-touch-icon` + `apple-mobile-web-app-capable` meta are present | Step 5 |

### Step 2 - Emit the gate-cell tests

Per [install-criteria], every gate cell is independently
assertable. Emit one test per cell:

```ts
// tests/install-gate.spec.ts
import { test, expect } from '@playwright/test';

// Fetch + parse the linked manifest once - reused by every field cell below.
async function readManifest(page, request) {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  return (await request.get(new URL(href!, page.url()).toString())).json();
}

test.describe('PWA install gate (per web.dev/articles/install-criteria)', () => {
  test('manifest link present', async ({ page }) => {
    await page.goto('https://localhost:3000/');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  });

  test('manifest declares name or short_name', async ({ page, request }) => {
    await page.goto('https://localhost:3000/');
    const m = await readManifest(page, request);
    expect(m.name || m.short_name).toBeTruthy();
  });

  test('manifest icons include 192px and 512px (per install-criteria)', async ({ page, request }) => {
    await page.goto('https://localhost:3000/');
    const m = await readManifest(page, request);
    const has192 = (m.icons ?? []).some((i: any) => /(^|\s)192x192(\s|$)/.test(i.sizes ?? ''));
    const has512 = (m.icons ?? []).some((i: any) => /(^|\s)512x512(\s|$)/.test(i.sizes ?? ''));
    expect(has192 && has512).toBe(true);
  });

  test('manifest start_url present', async ({ page, request }) => {
    await page.goto('https://localhost:3000/');
    const m = await readManifest(page, request);
    expect(m.start_url).toBeTruthy();
  });

  test('manifest display is installable value', async ({ page, request }) => {
    await page.goto('https://localhost:3000/');
    const m = await readManifest(page, request);
    // Per install-criteria: must be fullscreen, standalone, minimal-ui, or window-controls-overlay
    expect(['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay']).toContain(m.display);
  });

  test('manifest does not opt out via prefer_related_applications', async ({ page, request }) => {
    await page.goto('https://localhost:3000/');
    const m = await readManifest(page, request);
    // Per install-criteria: "must not be present or be false"
    expect(m.prefer_related_applications === undefined || m.prefer_related_applications === false).toBe(true);
  });

  test('site served over HTTPS', async ({ page }) => {
    await page.goto('https://localhost:3000/');
    // Allow localhost http for dev; production check enforces https
    const url = page.url();
    expect(url.startsWith('https://') || url.startsWith('http://localhost')).toBe(true);
  });

  test('service worker is registered (install prerequisite)', async ({ page, context }) => {
    await page.goto('https://localhost:3000/');
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    expect(sw.url()).toBeTruthy();
  });
});
```

### Step 3 - Emit the `beforeinstallprompt` handshake test

Per [customize-install], the canonical lifecycle is
`preventDefault` → stash → `prompt()` on user gesture →
`userChoice`. Emit the test:

```ts
test('beforeinstallprompt: deferred prompt + click → userChoice resolves', async ({ page }) => {
  await page.goto('https://localhost:3000/');

  // Simulate engagement gate - per install-criteria, "Users must click/tap the page
  // at least once and spend minimum 30 seconds viewing it"
  await page.click('body');
  await page.waitForTimeout(31_000);

  // Wait for the deferred prompt to land on window.__deferredPrompt
  const deferred = await page.waitForFunction(
    () => (window as any).__deferredPrompt !== undefined,
    null,
    { timeout: 10_000 }
  );
  expect(deferred).toBeTruthy();

  // Click the in-app Install button
  await page.click('[data-testid="install-pwa"]');

  // userChoice resolves to { outcome: 'accepted' | 'dismissed' }
  const outcome = await page.evaluate(async () => {
    const p = (window as any).__lastUserChoice;
    return p?.outcome ?? null;
  });
  expect(['accepted', 'dismissed']).toContain(outcome);
});
```

This requires the page bundle to expose `window.__deferredPrompt`
and `window.__lastUserChoice` for the test (or use a Playwright
init script that hooks the event). The 31-second engagement wait
is the engagement-gate cell from [install-criteria].

Per [customize-install]: *"You can only call `prompt()` on the
deferred event once."* - emit a second-call assertion:

```ts
test('beforeinstallprompt: second prompt() call rejects', async ({ page }) => {
  await page.goto('https://localhost:3000/');
  // ... engagement + prompt as above ...

  const error = await page.evaluate(async () => {
    try {
      await (window as any).__deferredPrompt.prompt();
      return null;
    } catch (e: any) {
      return e.message;
    }
  });
  expect(error).not.toBeNull();
});
```

### Step 4 - Emit the `appinstalled` analytics test

Per [customize-install]: `appinstalled` "fires whenever
installation succeeds, regardless of the trigger mechanism." Test
the listener binds and fires:

```ts
test('appinstalled fires after install acceptance', async ({ page }) => {
  await page.goto('https://localhost:3000/');

  const fired = await page.evaluate(() => new Promise<boolean>((resolve) => {
    window.addEventListener('appinstalled', () => resolve(true));
    // Trigger install (test fixture mocks the prompt to auto-accept)
    (window as any).__triggerInstall?.();
    setTimeout(() => resolve(false), 5_000);
  }));
  expect(fired).toBe(true);
});
```

The Playwright environment does not surface a real install (no
WebAPK minting headlessly), so the fixture either (a) mocks the
prompt resolver, or (b) dispatches a synthetic `appinstalled`
event in test mode.

### Step 5 - Emit the iOS-metadata branch

Per [learn-pwa], iOS Safari does not implement
`beforeinstallprompt`. The test surface is metadata + manual
smoke:

```ts
test('iOS install metadata: apple-touch-icon present', async ({ page }) => {
  await page.goto('https://localhost:3000/');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test('iOS install metadata: apple-mobile-web-app-capable yes', async ({ page }) => {
  await page.goto('https://localhost:3000/');
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"][content="yes"]')
  ).toHaveCount(1);
});

test('iOS install metadata: apple-touch-icon resolves', async ({ page, request }) => {
  await page.goto('https://localhost:3000/');
  const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const r = await request.get(new URL(href!, page.url()).toString());
  expect(r.status()).toBe(200);
  // Icon must be PNG for iOS
  expect(r.headers()['content-type']).toMatch(/png/i);
});
```

Per [learn-pwa]: iOS install "requires `apple-touch-icon` tag" - 
omitting this means installed PWAs get a generic icon, a regression
invisible until users file a bug.

### Step 6 - Emit the post-install `display-mode` test

Post-install, the PWA detects its installed state via the
`display-mode` MQ. Playwright doesn't auto-simulate installation;
launch with `--app=` for the standalone path:

```ts
import { chromium, expect, test } from '@playwright/test';

// Launch the standalone app context once - shared by both runtime cells.
async function launchInstalled() {
  const ctx = await chromium.launchPersistentContext('./tmp/installed-app', {
    args: ['--app=https://localhost:3000/'],
  });
  const page = await ctx.newPage();
  await page.goto('https://localhost:3000/');
  return { ctx, page };
}

test('display-mode: standalone in launched-as-app context', async () => {
  const { ctx, page } = await launchInstalled();
  const standalone = await page.evaluate(() =>
    matchMedia('(display-mode: standalone)').matches
  );
  expect(standalone).toBe(true);
  await ctx.close();
});

test('display-mode: hides Install button when standalone', async () => {
  const { ctx, page } = await launchInstalled();
  // Per references/install-flow-reference.md Stage 4: apps hide the Install button when already installed
  await expect(page.locator('[data-testid="install-pwa"]')).not.toBeVisible();
  await ctx.close();
});
```

### Step 7 - Emit the coverage matrix

Write `tests/install-coverage.yaml`, mapping every gate, handshake,
iOS-metadata, and runtime cell to its spec and source criterion. The full
matrix is in [references/install-suite.md](references/install-suite.md); its
per-stage shape:

```yaml
# tests/install-coverage.yaml
matrix:
  stage_1_gate:
    - cell: manifest_link
      spec: install-gate.spec.ts > "manifest link present"
      source: install-criteria
    # ... 7 more gate cells
  stage_2_handshake: # beforeinstallprompt userChoice + second-prompt reject
  stage_2_appinstalled: # appinstalled fires
  stage_3_ios: # apple-touch-icon + apple-mobile-web-app-capable
  stage_4_runtime: # display-mode standalone + install button hidden
```

CI gates on every matrix cell having a passing spec.

## Worked example: a 14-cell install suite

For a PWA with manifest `{ name, short_name, display: 'standalone',
start_url: '/', icons: [192, 512] }`, SW at `/sw.js`, install button
`[data-testid="install-pwa"]`, and iOS support:

| Stage | Cells emitted |
|---|---|
| Stage 1 (gate) | 8 cells (Step 2) |
| Stage 2 (handshake) | 2 cells (Step 3) |
| Stage 2 (analytics) | 1 cell (Step 4) |
| Stage 3 (iOS) | 3 cells (Step 5) |
| Stage 4 (runtime) | 2 cells (Step 6) |

Total: 16 cells across four spec files. Runs in ~45 seconds
(dominated by the 31-second engagement-wait test cell). Catches
the four classes of install regression most teams hit:

1. Manifest field drift breaking the gate.
2. `prompt()` called outside a user gesture.
3. iOS icon omitted, install renders generic.
4. In-app Install button visible after install (looks broken).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One test asserting "install works" | Per-cell regressions invisible | One spec per gate cell (Step 2) |
| Skip the 30s engagement wait | `beforeinstallprompt` never fires; test falsely fails on a gate cell | Step 3 explicit wait |
| Test `prompt()` on page load | Browser blocks per [customize-install]; test never reaches `userChoice` | Always bind to a user-gesture click |
| Pin a specific `display` value | Per [install-criteria], four values are installable | `toContain` not `toBe` (Step 2) |
| Mock `beforeinstallprompt` with `dispatchEvent(new Event())` | Real `BeforeInstallPromptEvent` has `.prompt()` + `.userChoice` methods; synthetic event lacks them | Hook a real listener in an init script |
| Skip iOS metadata tests because "we'll add it later" | Existing PWAs lose iOS users silently when icon resolves to 404 | Always include Step 5 |
| Assert `display-mode: standalone` from a normal Playwright page | A normal page is `display-mode: browser`; need `--app=` launch | Step 6 launches with `--app=` |
| Assume `appinstalled` fires the same session | Real installs may fire post-close; test plan must bind early | Bind listener at page load (Step 4) |

## Limitations

- **The 31-second engagement wait is real.** Per [install-criteria]
  "Users must click/tap the page at least once and spend minimum 30
  seconds viewing it." The test cell from Step 3 sleeps the wait
  literally - slow tests by ~30s. Run only on release branches if
  PR-CI time pressure is high.
- **Headless WebAPK minting can't be asserted.** Step 4's
  `appinstalled` test verifies the event fires; the actual Android
  WebAPK creation is opaque per
  [references/install-flow-reference.md](references/install-flow-reference.md)
  Stage 3.
- **iOS install is fully manual.** Step 5's tests cover the
  metadata; the actual Share → Add to Home Screen flow needs a
  real device. Document the manual smoke step in the PR template.
- **`--app=` launch is Chromium-only.** Firefox / WebKit cannot be
  driven into a `display-mode: standalone` context from headless
  Playwright; Step 6 is Chromium-only by design.
- **`prefer_related_applications: true`** suppresses the gate
  per [install-criteria]; the Step 2 cell asserts the field is
  absent or `false`, but a project that *intentionally* sets it
  must skip this cell (and the install flow as a whole).
- **Test fixture needs hooks.** Steps 3, 4 require
  `window.__deferredPrompt` and `window.__triggerInstall` to be
  surfaced by the page bundle in test mode. Document the hooks
  alongside the spec files.

## References

- web.dev - Install criteria (every gate cell, including HTTPS, SW,
  manifest fields, and the 30s engagement requirement) - 
  [install-criteria].
- web.dev - Learn PWA: Installation (per-platform flow, iOS Share
  menu path, `apple-touch-icon` requirement) - [learn-pwa].
- web.dev - Customize the install experience (`beforeinstallprompt`
  handshake, `prompt()` once-only, `appinstalled` firing
  conditions) - [customize-install].
- The install-flow contract (gate cells, handshake, per-platform paths,
  event timeline) -
  [references/install-flow-reference.md](references/install-flow-reference.md).
- Composes:
  `service-worker-lifecycle-tests`.
- Differentiation: `pwa-install-flow-tests` is the generic pattern
  wrapper. This builder emits the
  *per-PWA* suite tied to the project's actual manifest /
  handlers - the checked-in artifact, not the pattern reference.
- Sibling builders:
  `offline-fallback-tests`,
  `service-worker-lifecycle-tests`.
