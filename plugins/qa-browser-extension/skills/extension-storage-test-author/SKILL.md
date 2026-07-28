---
name: extension-storage-test-author
description: "Build-an-X workflow that emits a `chrome.storage` test suite. Picks the right area (`storage.local` 10 MB / `storage.sync` 100 KB total + 8 KB per item + 512 items + 1,800 writes/hour / `storage.session` 10 MB in-memory MV3-only / `storage.managed` read-only enterprise-policy) per access pattern, then generates tests for quota-exceeded behavior (`runtime.lastError` callback path + rejected promise async path), `storage.sync` per-item + total quotas, `storage.onChanged` event payload shape, multi-area write isolation, and Firefox-Chrome divergences (Firefox `storage.sync` quotas align with Chrome per MDN; Firefox `storage.managed` available; Firefox `storage.session` MV3-only). Output: a per-extension storage test file + matrix asserting the right area was chosen. Use when an extension persists state across sessions or devices and no test proves the chosen storage area survives its quota limits."
metadata:
  keywords: "chrome-storage, storage-sync, storage-local, storage-session, quota-bytes"
---

# extension-storage-test-author

## Overview

`chrome.storage` has four areas with non-overlapping quotas, persistence
semantics, and enterprise-policy posture. Picking the wrong one is a class of
bug the type checker can't catch: `storage.sync` silently rejects writes past
its total or per-item limit, `storage.session` evaporates on browser restart,
and `storage.managed` is read-only by definition and throws on write.

This skill emits the test suite that proves the right area was chosen, the
quota gates fire on the documented thresholds, and the `storage.onChanged`
payload shape matches across all writing code paths. The output is a Vitest /
Playwright spec the extension ships in its test suite. Quota constants are
stated once in the Step 2 decision matrix; the deeper worked templates, the
version-specific floors, and the Firefox-Chrome divergence table live in
[references/storage-test-templates.md](references/storage-test-templates.md).

[cr-storage]: https://developer.chrome.com/docs/extensions/reference/api/storage
[mdn-storage]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage

Composes with:

- `manifest-v3-test-surface-reference` - the SW-runtime restriction that bans `localStorage` and
  forces all persistent state into `chrome.storage.*`.
- `playwright-extension-fixtures` - the fixture that loads the extension so the spec can call into
  `chrome.storage.*` from a service-worker context.
- `mv2-to-mv3-migration-test-checklist` - Section 2 of that checklist forces every `localStorage` call
  through this skill's output.

For Playwright-driven MV3 popup / content-script fixtures see
`browser-extension-tests`. That skill covers `chrome.storage` *usage*
assertions; this builder covers *suite* design - area selection, quota gates,
event-payload conformance, multi-area isolation.

## When to use

- A new extension is deciding `local` vs `sync` vs `session` - generate the
  decision-matrix test that proves the choice.
- Migrating from `localStorage` to `chrome.storage.local` per the MV3
  service-worker rules - emit the equivalence test.
- A user-facing bug ("my settings disappeared") that may be a quota-exceeded
  silent drop on `storage.sync` - author the quota-boundary test that catches it.
- Adding an enterprise-policy `storage.managed` read path - emit the
  read-only-error test plus the policy-fixture loader.

## Workflow

### Step 1 - Inventory the access pattern

For each storage call in the extension, capture these facts:

| Fact | What to record |
|---|---|
| Size | Worst-case bytes per write + total across keys |
| Cross-device | Must the value follow the user across browsers? |
| Lifetime | Must the value survive browser restart? Extension reload? |
| Trust | Is the writer the extension, or an external authority (enterprise policy)? |

```bash
grep -rn 'chrome\.storage\.\|browser\.storage\.' \
  --include='*.{ts,js,tsx,jsx}' src/ \
  > storage-access-inventory.txt
```

### Step 2 - Pick the area per the decision matrix

The facts from Step 1 drive area choice. All constants below are from
[cr-storage]; state them once here and reference them by name later.

| Area | QUOTA_BYTES | Per-item | Lifetime | Cross-device | Writer |
|---|---|---|---|---|---|
| `storage.local` | 10,485,760 (10 MB) | none documented | until extension removal | no | extension |
| `storage.sync` | 102,400 (~100 KB) | 8,192 (8 KB) | persistent, synced | yes (when user signed in) | extension |
| `storage.session` | 10,485,760 (10 MB) | none documented | cleared on disable, reload, update, or browser restart; MV3-only | no | extension |
| `storage.managed` | - | - | as long as policy is in effect | varies | **admin only** - read-only for the extension |

`storage.sync` throughput caps: `MAX_ITEMS = 512`,
`MAX_WRITE_OPERATIONS_PER_MINUTE = 120`, `MAX_WRITE_OPERATIONS_PER_HOUR = 1,800`.
`MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE` is deprecated ("no longer has a
sustained write operation quota") - drop any assertion referencing it. The
version-specific floors (`local` 5 MB in Chrome 113-, `session` 1 MB in
Chrome 111-) are in
[references/storage-test-templates.md](references/storage-test-templates.md);
pin tests to the live constant, not a hard-coded number.

Emit a decision-matrix test:

```ts
import manifest from '../dist/manifest.json';

describe('storage area selection', () => {
  it('uses storage.sync only for user-preference-sized data', () => {
    // grep'd inventory; verify the sync writes are all < 8 KB
    const syncCalls = readStorageInventory().filter(c => c.area === 'sync');
    for (const c of syncCalls) {
      expect(c.maxBytes).toBeLessThan(8 * 1024); // QUOTA_BYTES_PER_ITEM
    }
  });

  it('does not use storage.session for data needed across browser restart', () => {
    const sessionCalls = readStorageInventory().filter(c => c.area === 'session');
    for (const c of sessionCalls) {
      expect(c.requiresPersistence).toBe(false);
    }
  });
});
```

### Step 3 - Quota-exceeded behavior (core template)

Quota-exceeded writes fail immediately and set `runtime.lastError` (callback
form) or reject the Promise (async form); tests must drive both paths. This
per-item template is the runnable core - the total-quota, callback, MAX_ITEMS,
event, isolation, and managed templates follow the same shape in
[references/storage-test-templates.md](references/storage-test-templates.md).

```ts
test('storage.sync rejects on per-item quota exceeded', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const result = await sw.evaluate(async () => {
    const oversized = 'x'.repeat(9 * 1024); // 9 KB > 8 KB limit
    try {
      await chrome.storage.sync.set({ big: oversized });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });

  expect(result.ok).toBe(false);
  // exact message is unstable; assert quota-shaped text
  expect(result.message).toMatch(/quota|QUOTA_BYTES/i);
});
```

### Step 4 - Author the remaining cells

One spec per row, from the templates in
[references/storage-test-templates.md](references/storage-test-templates.md):

| Test | Asserts |
|---|---|
| `storage.sync` total-quota (>100 KB) | a write past `QUOTA_BYTES = 102,400` rejects |
| callback-path equivalence | quota also sets `runtime.lastError` in callback form |
| `MAX_ITEMS` (512) | the 513th unique key rejects |
| `storage.onChanged` shape | listener receives `(changes, areaName)` with `changes[key] = { oldValue?, newValue? }` |
| multi-area isolation | a `storage.local` write is invisible to `storage.sync` |
| `storage.managed` read-only | any `managed.set` rejects ("modify this namespace results in an error" per [mdn-storage]) |
| Firefox parity | gate `session` / `sync` sign-in / `managed` per the divergence table |

### Step 5 - Emit the suite

Write `tests/storage.spec.ts` covering every cell, paired with a YAML manifest
mapping each spec to the matrix cell it covers:

```yaml
# tests/storage-coverage.yaml
matrix:
  area_selection: ["uses sync only for pref-sized data", "no session for cross-restart data"]
  quota_exceeded: ["sync per-item >8 KB", "sync total >100 KB", "callback sets lastError"]
  throughput: ["MAX_ITEMS = 512"]
  events: ["onChanged shape (changes, areaName)"]
  isolation: ["local invisible to sync"]
  managed: ["managed write rejects"]
  firefox_parity: ["storage.session MV3-only on Firefox"]
```

CI gates on every cell having at least one passing test.

## Worked example: a 4-row suite for a settings extension

For an extension that stores `{ theme: 'dark', apiKey: '...', tabsOpenCount: N }`:

| Key | Area chosen | Reason | Quota test |
|---|---|---|---|
| `theme` | `storage.sync` | User preference; cross-device | 8 KB per-item cap test |
| `apiKey` | `storage.local` | Sensitive - should not leave device; gate on first-party-only | total-quota test |
| `tabsOpenCount` | `storage.session` | Resets each session | session-clears-on-restart test |
| (admin policy URL) | `storage.managed` | Enterprise-only | managed-write-rejects test |

Each row produces one spec from the Step 3 core template and its
[references/storage-test-templates.md](references/storage-test-templates.md)
variants. Per [mdn-storage], no area encrypts at rest ("Storage area is not
encrypted, and shouldn't store confidential information") - if the extension
stores credentials, add a separate encryption-at-rest test (out of scope here).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only happy-path `set` + `get` | Quota silently drops past 8 KB / 100 KB | Author quota tests per Step 3 |
| Assert exact error message string | Wording isn't pinned; matching `/quota/i` is the stable surface | Use regex match per Step 3 |
| Use `storage.sync` for binary / image data | 100 KB total + 8 KB per-item caps; not designed for blobs | Move to `storage.local` per Step 2 |
| Use `storage.session` for cross-restart data | Cleared on restart; tests pass in single session, prod fails on cold start | Step 2 decision matrix |
| Skip `storage.managed` read-only test | Extension's own write code may silently throw in enterprise deployments | Test per Step 4 |
| Assume `MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE` still applies | Deprecated per [cr-storage] | Drop the constant from tests |
| Hard-code the `storage.local` limit | Chrome 113- was 5 MB; current is 10 MB - pin the test to the live constant | Read the constant, not a literal |
| Listen for `onChanged` once and expect no further fires | Every write fires; listener must filter or accumulate | Always filter on `areaName` + key |

## Limitations

- **Sync round-trip requires sign-in.** Tests asserting that a
  `storage.sync.set` propagates to a second device need both profiles signed in
  to the same Chrome / Firefox account - not testable in headless CI without
  account credentials.
- **`storage.session` is MV3-only**; tests in MV2 contexts must skip or fall
  back to `storage.local` with a cleanup hook.
- **Throughput caps are server-side.** The `MAX_WRITE_OPERATIONS_PER_HOUR = 1,800`
  cap is enforced by sync servers, not the local client; tests can only assert
  the extension's own batching stays under the cap.
- **Encryption-at-rest is out of scope.** Per [mdn-storage], no area encrypts by
  default; auditing what the extension stores requires a separate threat-model test.
- **`storage.managed` policy injection** differs per OS (Windows registry, macOS
  plist, Linux JSON) - CI mocking is platform-specific and not covered here.
- **Firefox `storage.sync` quotas** are not enumerated as constants on the
  top-level [mdn-storage] page; the divergence table assumes Chrome-quota parity
  per the linked StorageArea sub-page - re-verify on Firefox stable before pinning.

## References

- Chrome - `chrome.storage` API reference (quotas, deprecation notices,
  quota-exceeded behavior) - [cr-storage].
- MDN - WebExtensions storage API (Firefox semantics, managed-area read-only
  quote, encryption caveat) - [mdn-storage].
- Deeper worked templates, version-specific floors, Firefox-Chrome divergence
  table - [references/storage-test-templates.md](references/storage-test-templates.md).
- Composes: `manifest-v3-test-surface-reference`, `playwright-extension-fixtures`,
  `mv2-to-mv3-migration-test-checklist`.
- Sibling builder: `mv2-to-mv3-migration-test-checklist`.
