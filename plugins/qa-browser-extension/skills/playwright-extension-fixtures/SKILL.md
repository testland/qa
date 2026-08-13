---
name: playwright-extension-fixtures
description: "Author the Playwright fixture layer every Chromium extension test depends on - `chromium.launchPersistentContext` with `--disable-extensions-except=$DIR` + `--load-extension=$DIR`, the `channel: 'chromium'` selection that unlocks headless extension support, the `context.serviceWorkers()` + `waitForEvent('serviceworker')` race-handling pattern, and the `extensionId = serviceWorker.url().split('/')[2]` extraction recipe - plus the extension load / reload matrix (which edit re-evaluates which surface) and the `chrome.storage` test suite (area selection, quota-exceeded, `storage.onChanged`, managed read-only) in references/. Use when authoring or debugging the fixture a Chromium extension test imports, when an edit appears to have no effect and you need the reload matrix, or when authoring storage-quota tests."
metadata:
  keywords: "playwright, chromium, launchpersistentcontext, test-fixtures, browser-extension"
---

# playwright-extension-fixtures

## Overview

Every Playwright-driven Chromium-extension test starts the same
way: a persistent context launched with two flags, a service-worker
race, and an extension-ID extraction. Per the
[Playwright Chrome extensions docs][pw-ext], this fixture is the
contract the assertion-level skills depend on - it's the
foundation, not the test logic.

This skill is **distinct from
`browser-extension-tests`**
(MV3 popup + content-script assertions); this is the lower-level
Playwright fixture pattern (`launchPersistentContext` +
`--disable-extensions-except` + `--load-extension`) shared by all
extension tests. The neighbour skill is the "what to assert"
playbook; this skill is the "how to launch" reference that any
test - extension popup, content script, service worker, options
page, side panel - needs to import first.

[pw-ext]: https://playwright.dev/docs/chrome-extensions

Composes with:

- [references/reload-matrix.md](references/reload-matrix.md) - which edits require which reload; the manual `chrome://extensions` gesture this fixture automates.
- [references/storage-tests.md](references/storage-tests.md) - the `chrome.storage` area / quota / event test suite run from this fixture's SW context.
- `manifest-v3-test-surface-reference` - the manifest fields the fixture is testing against.

## When to use

- Authoring a Playwright test against any unpacked Chromium
  extension (popup, content script, service worker, options page,
  side panel, devtools page).
- Headless CI runs of an extension - the `channel: 'chromium'`
  selection is what unlocks headless extension support per
  [pw-ext].
- Diagnosing a "tests pass locally headed, fail headless" bug - 
  the channel / flag matrix in this skill is the first checkpoint.
- Sharing the fixture across multiple spec files in the same
  repository (a `fixtures.ts` that every spec imports).

## Authoring

### The verbatim fixture file

Per [pw-ext], `fixtures.ts`:

```typescript
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(__dirname, 'my-extension');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
```

### Field-by-field rationale

| Element | Why it matters per [pw-ext] |
|---|---|
| `chromium.launchPersistentContext('')` | *"Extensions require a persistent context in Chromium"* - `launch()` is non-persistent and extensions never load |
| `''` (userDataDir) | Empty string = ephemeral temp dir (Playwright cleans up); replace with a fixed path to persist auth state across runs |
| `channel: 'chromium'` | The bundled Chromium channel; unlocks **headless extension support** per [pw-ext] |
| `--disable-extensions-except=$DIR` | Prevents any pre-installed extension from also loading and confusing assertions |
| `--load-extension=$DIR` | Loads the unpacked extension at `$DIR` (where `manifest.json` lives) |
| `context.serviceWorkers()` | Synchronous accessor - may be empty if the SW hasn't registered yet |
| `context.waitForEvent('serviceworker')` | Race-safe fallback when SW isn't yet up |
| `serviceWorker.url().split('/')[2]` | Service-worker URL is `chrome-extension://<id>/<path>`; index 2 is the ID |

### Usage in spec files

Per [pw-ext]:

```typescript
import { test, expect } from './fixtures';

test('example test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('body')).toHaveText('Changed by my-extension');
});

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('body')).toHaveText('my-extension popup');
});
```

The fixture-injected `page` automatically belongs to the persistent
context - any content scripts the extension declares for the
navigated URL will already be attached.

## Running

### Local headed

```bash
npx playwright test
```

Defaults to headed for extensions (per [pw-ext], non-`chromium`
channels require headed mode).

### Local + CI headless

```bash
npx playwright test --headed=false
```

Requires `channel: 'chromium'` in the fixture per [pw-ext]:

> "Headless mode for extensions is supported only when using the
> `chromium` channel."

Edge channel and Chrome channel will fail extension load in
headless because, quoting [pw-ext]:

> "Google Chrome and Microsoft Edge removed the command-line flags
> needed to side-load extensions."

### MV2 fallback for extensionId

Per [pw-ext], the SW fixture is MV3-specific. For an MV2 extension
where the background context is a background page (not a service
worker), extract the ID from a background-page event instead:

```typescript
extensionId: async ({ context }, use) => {
  // for manifest v2:
  let [background] = context.backgroundPages();
  if (!background) background = await context.waitForEvent('backgroundpage');
  const extensionId = background.url().split('/')[2];
  await use(extensionId);
},
```

`backgroundPages()` is the MV2 analogue of `serviceWorkers()`.

### Pinning the temp profile

Replace `''` with a fixed `userDataDir` to persist auth across
runs:

```typescript
const userDataDir = path.join(__dirname, '.pw-profile');
const context = await chromium.launchPersistentContext(userDataDir, { ... });
```

Trade-off: stateful runs become non-deterministic; do this only for
debugging an auth flow, not for CI.

## Parsing results

### Service-worker restart errors

Per [pw-ext], MV3 service workers auto-suspend after ~30s idle.
Playwright keeps "the same Worker object alive" across the
restart, but *"an in-flight `evaluate()` at the moment of
suspension will throw"* with the message:

> `"Service worker restarted"`

Handle in tests by retrying the evaluate:

```typescript
async function swEvaluate<T>(sw: any, fn: () => T): Promise<T> {
  try { return await sw.evaluate(fn); }
  catch (e: any) {
    if (e.message.includes('Service worker restarted')) {
      return await sw.evaluate(fn); // re-run once
    }
    throw e;
  }
}
```

### Extension-load failures

If `serviceWorker` never fires and `waitForEvent` times out,
typical causes:

| Symptom | Likely cause | Fix |
|---|---|---|
| `waitForEvent('serviceworker')` times out | Manifest invalid or `background.service_worker` field missing | Load unpacked via `chrome://extensions` manually first and read the red Errors card |
| Extension loads in headed but not headless | Channel set to `chrome` / `msedge` instead of `chromium` | Use `channel: 'chromium'` per [pw-ext] |
| `extensionId` extracts an empty string | URL not `chrome-extension://...` shape (e.g., `about:blank` listener fired) | Filter on `serviceWorker.url().startsWith('chrome-extension://')` before split |

## CI integration

GitHub Actions example:

```yaml
name: extension-e2e
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: 'lts/*' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Build extension
        run: npm run build:extension
      - name: E2E
        run: npx playwright test
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

Key choices:

- `npx playwright install --with-deps chromium` - installs the
  bundled Chromium that the `channel: 'chromium'` fixture uses.
- No `xvfb` needed - headless Chromium extensions work per [pw-ext].

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `chromium.launch()` instead of `launchPersistentContext` | Extension never loads per [pw-ext] | Always use the persistent variant |
| `channel: 'chrome'` or `channel: 'msedge'` | Side-load flags removed per [pw-ext]; headless will fail | Use `channel: 'chromium'` |
| Hardcoding `extensionId` from a local install | ID changes per build / per machine | Extract from SW URL via the fixture |
| Skipping the `waitForEvent('serviceworker')` fallback | Race: SW not yet registered → `[]` from `serviceWorkers()` → undefined ID | Always include the if-empty branch per [pw-ext] |
| Persistent `userDataDir` in CI | Auth state leaks between runs; flaky | Use `''` for CI determinism |
| Catching `"Service worker restarted"` as a permanent failure | Per [pw-ext] this is recoverable; the SW resumes | Retry the evaluate once |
| Using extra `--args` without verifying they don't conflict | Per [pw-ext]: *"some of them may break Playwright functionality"* | Add browser args defensively, one at a time |

## Limitations

- **Chromium-only.** Per [pw-ext], the fixture covers
  Chromium-family extensions only. Firefox WebExtensions test
  differently - see the `web-ext` reference in
  `manifest-v3-test-surface-reference`
  (references/web-ext-firefox.md) for the Mozilla-side runner.
- **MV3 SW lifecycle is asynchronous.** The 30s auto-suspend is
  non-deterministic; tests timing-sensitive to it should use
  `chrome.alarms` (see
  `manifest-v3-test-surface-reference`).
- **Custom args at own risk.** Per [pw-ext]: *"Use custom browser
  args at your own risk, as some of them may break Playwright
  functionality."*
- **`--disable-extensions-except` requires absolute path.** Relative
  paths silently fail to load - always pass `path.resolve(...)`.
- **`devtools_page` / side-panel test surfaces aren't covered here.**
  The base fixture works; the assertion patterns for those
  surfaces are extension-specific.

## References

- Playwright Chrome extensions docs (the fixture pattern, channel
  guidance, MV3 SW behaviour, headless support) - [pw-ext].
- `chromium.launchPersistentContext` API - 
  [playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context).
- [references/reload-matrix.md](references/reload-matrix.md) - the
  load / reload matrix and its automation equivalents.
- [references/storage-tests.md](references/storage-tests.md) - the
  `chrome.storage` quota / area / event test suite.
- Composes:
  `manifest-v3-test-surface-reference`.
- Distinct neighbour:
  `browser-extension-tests` - the popup / content-script / messaging assertion playbook this
  fixture feeds.
