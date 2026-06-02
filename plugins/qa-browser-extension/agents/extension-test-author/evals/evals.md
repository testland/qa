---
component: extension-test-author
type: agent
archetype: A2
---

# extension-test-author - evals

Companion eval cases for [`extension-test-author`](../../extension-test-author.md).
Three cases covering happy path (MV3 background SW storage) + branch
(content-script injection) + adversarial (MV1 manifest refusal). Pass conditions
are concrete string-match checks a reviewer can grep from a transcript.

## Eval 1: happy path - MV3 background service worker storage

**Input:**
- `manifest.json` contains `"manifest_version": 3` and no `applications.gecko` block.
- Behavior spec: "On install, the extension writes `{ first_run: true }` to `chrome.storage.local`. Test verifies the value is present after the service worker's `install` event fires."
- Target surface: background service worker storage write.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Emits one Playwright spec at `tests/extension-bg-storage.spec.ts` that:
- launches a persistent context with `--load-extension` per `playwright-extension-fixtures`
- captures the service worker via `const [sw] = await context.serviceWorkers();`
- asserts the storage value via `await sw.evaluate(() => chrome.storage.local.get('first_run'))`
- expects `{ first_run: true }`

**Pass condition:** Output contains the literal substrings `context.serviceWorkers()` AND `chrome.storage.local` AND `tests/extension-` and does NOT contain `backgroundPages()`.

## Eval 2: branch - content-script injection on a target page

**Input:**
- `manifest.json` contains MV3 + a `content_scripts` block matching `https://github.com/*`.
- Behavior spec: "The content script injects a `<div data-extension-banner>` into the body of every github.com page. Test verifies the banner is visible after navigation."
- Target surface: content script.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Emits one Playwright spec at `tests/extension-content-script.spec.ts` that:
- launches a persistent context with the extension loaded
- navigates `page.goto('https://github.com')` (or a fixture page if offline-required)
- asserts visibility via `await expect(page.locator('[data-extension-banner]')).toBeVisible()`
- does NOT mock the content script - drives it through real navigation

**Pass condition:** Output contains the literal substrings `page.goto` AND `github.com` AND `[data-extension-banner]` AND `toBeVisible()`.

## Eval 3: adversarial - refuse on MV1 manifest

**Input:**
- `manifest.json` contains `"manifest_version": 1` (legacy).
- Behavior spec: "Test the background page's handling of the `onAlarm` event."
- Target surface: background page.

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to author a test. Explains that Chrome dropped MV1 support, that the user must migrate to at least MV2 (then MV3 via `mv2-to-mv3-migration-test-checklist`), and emits no test code. Does NOT silently treat MV1 as MV2.

**Pass condition:** Output contains the literal substring `manifest_version` AND ("MV1" OR "Chrome dropped" OR "migrate") AND does NOT contain `test(` OR `await page.` OR `chromium.launchPersistentContext`.

## Notes

- Eval file lives outside the lint glob (`*/agents/*/evals/*` is excluded by `validate.sh` and `rating-check.sh`), so this file does not need rating frontmatter.
- Pass conditions are literal-string checks; a reviewer can grep the agent's transcript output for each substring without re-running the agent.
- Target-model dates are eval-authoring dates (2026-05-25), not execution dates - the cases are designed to be re-run by a reviewer against each tier.
