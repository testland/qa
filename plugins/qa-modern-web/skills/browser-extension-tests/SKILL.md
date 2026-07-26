---
name: browser-extension-tests
description: "Test Chromium browser extensions (MV3) with Playwright via `launchPersistentContext` + `--load-extension` / `--disable-extensions-except` flags. Cover service worker, popup pages, content scripts, message passing, and `chrome.runtime` API mocking. Service worker auto-suspends ~30s; Playwright keeps the Worker object alive across restarts. Use when a repo builds a Chromium extension (a `manifest.json` with `manifest_version: 3` and a built `dist/`) and its popup, content-script injection, background worker, or `chrome.storage` behavior needs automated coverage."
metadata:
  keywords: "browser-extension, chrome-extension, manifest-v3, playwright, service-worker"
---

# browser-extension-tests

Per the [Playwright Chrome extensions docs]: load extensions via
`launchPersistentContext` with `--disable-extensions-except` +
`--load-extension` args. *"Google Chrome and Microsoft Edge removed
the command-line flags needed to side-load extensions"* - use the
bundled Chromium browser, not Chrome channel.

## When to use

- Testing a browser extension popup page interaction.
- Validating content-script injection on matching URLs.
- Exercising background service worker (alarms, listeners, message
  routing).
- Verifying `chrome.storage` reads/writes survive reload.

## How to use

1. Build the extension so `dist/` holds the MV3 `manifest.json`
   (`manifest_version: 3`) and bundled `popup.html` / content scripts.
2. Add the `tests/fixtures.ts` extension-loading fixture (Step 1) so every
   test receives a persistent `context` and the resolved `extensionId`.
3. Test the popup at `chrome-extension://${extensionId}/popup.html` and
   content-script injection on matching page URLs (Steps 2-3).
4. Cover background behavior - message passing, `chrome.storage`, and
   service-worker auto-suspend - with
   [references/advanced-recipes.md](references/advanced-recipes.md).
5. Switch the fixture to the `chromium` channel with `headless: true` for
   CI runs (Step 7).
6. Run `npx playwright test`; consult the Anti-patterns table when the
   extension fails to load or the service worker is missing.

## Step 1 - Test fixture for extension loading

`tests/fixtures.ts`:

```ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const pathToExtension = path.resolve(__dirname, '..', 'dist');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
```

Per [Playwright Chrome extensions docs]. The `extensionId` fixture
extracts the ID from the service worker URL - needed to navigate to
`chrome-extension://${extensionId}/popup.html`.

## Step 2 - Test the popup page

```ts
import { test, expect } from './fixtures';

test('popup renders and increments counter', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.click('[data-testid="increment"]');
  await expect(page.locator('[data-testid="count"]')).toHaveText('1');
});
```

## Step 3 - Test content script injection

```ts
test('content script highlights matched terms', async ({ page }) => {
  await page.goto('https://example.com/');
  // Content script runs at document_idle by default
  await page.waitForFunction(() =>
    document.querySelector('[data-extension-marker]') !== null
  );
  await expect(page.locator('mark[data-extension-marker]')).toHaveCount(3);
});
```

## Steps 4-6 - Background, storage, and lifecycle recipes

Message passing (popup ↔ background), `chrome.storage` persistence across
reload, and surviving MV3 service-worker auto-suspend (~30s) are covered as
ready-to-paste recipes in
[references/advanced-recipes.md](references/advanced-recipes.md). Each reuses
the Step 1 fixture.

## Step 7 - Headless mode

For CI (no display server), use the `chromium` channel + headless
new mode. Per [Playwright Chrome extensions docs], headless support
landed in modern Chromium. Configure:

```ts
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true, // 'new' headless required for extensions
  args: [...]
});
```

## Worked example

Scenario: a "Reader" extension whose popup increments a counter and toggles a
`pref` written to `chrome.storage`, with a content script that marks matched
terms on visited pages.

1. `npm run build` emits `dist/manifest.json` (`manifest_version: 3`) plus
   `popup.html` and `content.js`.
2. Add `tests/fixtures.ts` from Step 1; the `extensionId` fixture reads the SW
   URL, e.g. `chrome-extension://abcdefghijklmnop/`.
3. The popup test (Step 2) opens `chrome-extension://${extensionId}/popup.html`,
   clicks `[data-testid="increment"]`, and asserts the count reads `1`.
4. The content-script test (Step 3) visits `https://example.com/`, waits for the
   injected marker, and asserts three `mark[data-extension-marker]` nodes.
5. The storage recipe (Steps 4-6) sets `{ pref: 'dark' }`, reloads the popup,
   and asserts the value survives.
6. `npx playwright test` runs headed locally; CI reruns it with
   `channel: 'chromium', headless: true` (Step 7).

Result: a green run confirms popup rendering, content-script injection, and
storage persistence across reload - the extension's core surfaces are covered.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use `chromium.launch()` (non-persistent) | Extension never loads; persistent context required | Always `launchPersistentContext` (Step 1) |
| Use `chrome` channel | Side-load flags removed in stable Chrome / Edge | Use bundled `chromium` channel (Step 7) |
| Hardcode `extensionId` from local install | ID changes per build / per machine | Extract from SW URL (Step 1 fixture) |
| Test in MV2 mode | Deprecated; production extensions are MV3 | Always test against the manifest version you ship |
| Skip waitForEvent('serviceworker') | Race: SW not yet registered | Always await the event (Step 1) |

## Limitations

- Playwright Chrome extension support targets Chromium; Firefox WebExtensions
  use a different test approach (see Mozilla's `web-ext` tooling).
- Some extension APIs (`chrome.declarativeNetRequest`) cannot be
  fully unit-tested without a browser; integration tests are required.
- Auto-suspend timing varies by Chromium version - verify against
  the [Playwright Chrome extensions docs].

## References

- [Playwright Chrome extensions docs] - fixture pattern, service
  worker access, MV3 auto-suspend behavior

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
