---
name: pwa-install-flow-tests
description: Test the Progressive Web App install flow (Web App Manifest validation, `beforeinstallprompt` event handling, installability criteria, install prompt UX). Covers desktop install badge, Android WebAPK minting, iOS Add to Home Screen, and the `appinstalled` event.
type: skill
archetype: S1
rating: 22
d6: 4
keywords:
  - pwa
  - web-app-manifest
  - beforeinstallprompt
  - installability
  - service-worker
---

# pwa-install-flow-tests

Per the [PWA installation guide], installability requires a Web App
Manifest with `display: standalone | minimal-ui`, `start_url`, icons,
and `name` — plus a registered service worker (most browsers) and
HTTPS.

## When to use

- Pre-release: validate the manifest meets installability criteria
  on Chrome/Edge/Android.
- Regression: ensure a manifest change didn't break install
  eligibility.
- UX testing: the in-app install prompt fires when expected and
  records `outcome` for analytics.

## Step 1 — Validate manifest fields

```ts
import { test, expect } from '@playwright/test';

test('manifest meets installability criteria', async ({ page, request }) => {
  await page.goto('https://localhost:3000');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const manifestUrl = new URL(manifestHref!, page.url()).toString();
  const manifest = await (await request.get(manifestUrl)).json();

  // Per https://web.dev/learn/pwa/installation requirements
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(['standalone', 'minimal-ui', 'fullscreen']).toContain(manifest.display);
  expect(manifest.start_url).toBeTruthy();

  // At least one icon ≥ 192x192 (PNG); Android WebAPK requires 512x512 maskable
  const has192 = manifest.icons?.some((i: any) => /(^|\s)192x192(\s|$)/.test(i.sizes ?? ''));
  const has512 = manifest.icons?.some((i: any) => /(^|\s)512x512(\s|$)/.test(i.sizes ?? ''));
  expect(has192 && has512).toBe(true);
});
```

Per the [PWA installation guide]: manifest fields drive desktop
install badge + Android WebAPK minting + iOS home-screen icon.

## Step 2 — Validate service worker registered

```ts
test('service worker registered (installability prerequisite)', async ({ page, context }) => {
  await page.goto('https://localhost:3000');

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  expect(sw.url()).toBeTruthy();
});
```

Cross-ref `service-worker-tests` skill for SW lifecycle testing.

## Step 3 — Trigger and capture `beforeinstallprompt`

```ts
test('beforeinstallprompt fires; user accept resolves', async ({ page }) => {
  await page.goto('https://localhost:3000');

  const prompt = await page.evaluate(() => {
    return new Promise<{ platforms: string[] }>((resolve) => {
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        // Stash for app's "Install" button handler
        (window as any).__deferredPrompt = e;
        resolve({ platforms: e.platforms });
      });
    });
  });

  expect(prompt.platforms).toContain('web');

  // Click app's Install button → triggers stored prompt.prompt()
  await page.click('[data-testid="install-pwa"]');

  const outcome = await page.evaluate(async () => {
    const p = (window as any).__deferredPrompt;
    p.prompt();
    const choice = await p.userChoice;
    return choice.outcome; // 'accepted' | 'dismissed'
  });

  expect(['accepted', 'dismissed']).toContain(outcome);
});
```

Note: `beforeinstallprompt` only fires when Chromium's heuristics +
Step 1 + Step 2 criteria pass + the user has not already installed.
Test environments may need `--enable-features=InstallPromptForApp`.

## Step 4 — Verify `appinstalled` event analytics

```ts
test('appinstalled fires after acceptance', async ({ page }) => {
  await page.goto('https://localhost:3000');
  // ... trigger prompt as Step 3 ...

  const installed = await page.evaluate(() => {
    return new Promise<boolean>((resolve) => {
      window.addEventListener('appinstalled', () => resolve(true));
      // Wait up to 5s
      setTimeout(() => resolve(false), 5000);
    });
  });
  expect(installed).toBe(true);
});
```

Useful for analytics: increment install counter on this event.

## Step 5 — iOS path (manual / advisory)

Per the [PWA installation guide]: iOS/iPadOS requires manual install
via Share menu → "Add to Home Screen". Cannot be triggered
programmatically. Test by:

- Manual smoke test on real iOS Safari + iPadOS Safari before each
  release.
- Verify the manifest's `apple-touch-icon` link tag is present + the
  icon resolves.

```ts
test('iOS install metadata present', async ({ page }) => {
  await page.goto('https://localhost:3000');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"][content="yes"]')).toHaveCount(1);
});
```

## Step 6 — Display-mode media query test

After install, display mode shifts. Detect:

```ts
test('display-mode standalone after install', async ({ page }) => {
  // Simulate installed mode
  await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
  // Playwright doesn't natively emulate display-mode; use launch arg:
  // chromium.launchPersistentContext(dir, { args: ['--app=https://localhost:3000'] })

  const isStandalone = await page.evaluate(() =>
    matchMedia('(display-mode: standalone)').matches
  );
  expect(isStandalone).toBe(true);
});
```

Apps often hide the "Install" button when already installed —
check via `display-mode: standalone` MQ.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test install flow without a registered SW | `beforeinstallprompt` never fires | Step 2 prerequisite |
| Manifest in subdir without `scope` | `start_url` outside scope; install fails silently | Set explicit `scope` matching `start_url` parent |
| Skip 512x512 maskable icon | Android WebAPK minting fails | Step 1 enforces both 192 + 512 |
| Trigger `prompt()` automatically on page load | Browser blocks; users hate it | Always require user gesture (Step 3 stores deferred prompt) |
| Test only on Chromium | iOS / Firefox install behavior differs | Step 5 covers iOS metadata; manual smoke on each browser |

## Limitations

- iOS install is fully manual; cannot be programmatically triggered
  or asserted on real devices via Playwright.
- Chromium installability heuristics evolve; the [PWA installation
  guide] is the authoritative source for current criteria.
- Some embedded WebViews (Android WebView, iOS WKWebView in apps)
  do not expose install prompts at all.

## References

- [PWA installation guide] — manifest requirements, install criteria,
  per-platform behavior

[PWA installation guide]: https://web.dev/learn/pwa/installation
