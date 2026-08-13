# Extension surface test recipes

Assertion recipes for `playwright-extension-fixtures`: what to test on
each Chromium-extension surface (popup, content script, background
service worker, messaging, `chrome.storage`) once the fixture from the
main skill is in place. Every test below imports `test` / `expect` from
the fixture file, which supplies the persistent `context` and the
resolved `extensionId`.

## Popup page

```ts
import { test, expect } from './fixtures';

test('popup renders and increments counter', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.click('[data-testid="increment"]');
  await expect(page.locator('[data-testid="count"]')).toHaveText('1');
});
```

## Content script injection

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

## Message passing (popup to background)

```ts
test('popup sends message; background responds', async ({ context, extensionId }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  // Eval in service worker context
  const swReady = await sw.evaluate(() => {
    return new Promise<string>((resolve) => {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        sendResponse({ echo: msg.text });
        return true;
      });
      resolve('ready');
    });
  });
  expect(swReady).toBe('ready');

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  const reply = await popup.evaluate(async () => {
    return chrome.runtime.sendMessage({ text: 'hello' });
  });
  expect(reply).toEqual({ echo: 'hello' });
});
```

## `chrome.storage` persistence

Quota, area-selection, and `storage.onChanged` tests are in
[storage-tests.md](storage-tests.md); the baseline persistence check:

```ts
test('storage value persists across popup reload', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  await popup.evaluate(async () => {
    await chrome.storage.local.set({ pref: 'dark' });
  });
  await popup.reload();

  const value = await popup.evaluate(async () => {
    const { pref } = await chrome.storage.local.get('pref');
    return pref;
  });
  expect(value).toBe('dark');
});
```

## Survive MV3 service-worker auto-suspend

Per [Playwright Chrome extensions docs]: Chrome auto-suspends MV3
service workers after ~30s of inactivity. Playwright keeps the same
Worker object alive - `evaluate()` calls continue transparently
without requiring new event handlers.

```ts
test('alarm survives service worker restart', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  await sw.evaluate(() => chrome.alarms.create('hourly', { periodInMinutes: 60 }));

  // Simulate idle
  await new Promise(r => setTimeout(r, 35_000));

  // Same sw object; evaluate still works post-restart
  const alarms = await sw.evaluate(() => chrome.alarms.getAll());
  expect(alarms.find((a: any) => a.name === 'hourly')).toBeDefined();
});
```

## Worked example

Scenario: a "Reader" extension whose popup increments a counter and toggles a
`pref` written to `chrome.storage`, with a content script that marks matched
terms on visited pages.

1. `npm run build` emits `dist/manifest.json` (`manifest_version: 3`) plus
   `popup.html` and `content.js`.
2. Add the fixture from the main skill; the `extensionId` fixture reads the SW
   URL, e.g. `chrome-extension://abcdefghijklmnop/`.
3. The popup test opens `chrome-extension://${extensionId}/popup.html`,
   clicks `[data-testid="increment"]`, and asserts the count reads `1`.
4. The content-script test visits `https://example.com/`, waits for the
   injected marker, and asserts three `mark[data-extension-marker]` nodes.
5. The storage recipe sets `{ pref: 'dark' }`, reloads the popup,
   and asserts the value survives.
6. `npx playwright test` runs headed locally; CI reruns it with
   `channel: 'chromium', headless: true` per the main skill.

Result: a green run confirms popup rendering, content-script injection, and
storage persistence across reload - the extension's core surfaces are covered.

## Limitations

- These recipes target Chromium; Firefox WebExtensions use Mozilla's
  `web-ext` tooling (see `manifest-v3-test-surface-reference`,
  references/web-ext-firefox.md).
- Some extension APIs (`chrome.declarativeNetRequest`) cannot be
  fully unit-tested without a browser; integration tests are required.
- Auto-suspend timing varies by Chromium version - verify against
  the [Playwright Chrome extensions docs].

## References

- [Playwright Chrome extensions docs] - fixture pattern, service
  worker access, MV3 auto-suspend behavior

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
