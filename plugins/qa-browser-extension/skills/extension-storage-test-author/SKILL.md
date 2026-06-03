---
name: extension-storage-test-author
description: "Build-an-X workflow that emits a `chrome.storage` test suite. Picks the right area (`storage.local` 10 MB / `storage.sync` 100 KB total + 8 KB per item + 512 items + 1,800 writes/hour / `storage.session` 10 MB in-memory MV3-only / `storage.managed` read-only enterprise-policy) per access pattern, then generates tests for quota-exceeded behavior (`runtime.lastError` callback path + rejected promise async path), `storage.sync` per-item + total quotas, `storage.onChanged` event payload shape, multi-area write isolation, and Firefox-Chrome divergences (Firefox `storage.sync` quotas align with Chrome per MDN; Firefox `storage.managed` available; Firefox `storage.session` MV3-only). Output: a per-extension storage test file + matrix asserting the right area was chosen."
rating: 23
d6: 4
keywords:
  - chrome-storage
  - storage-sync
  - storage-local
  - storage-session
  - quota-bytes
---

# extension-storage-test-author

## Overview

`chrome.storage` has four areas with non-overlapping quotas,
persistence semantics, and enterprise-policy posture. Picking the
wrong one is a class of bug the type checker can't catch:
`storage.sync` silently rejects writes past the 100 KB total or
8 KB per-item limit per [Chrome storage reference][cr-storage];
`storage.session` evaporates on browser restart per [cr-storage];
`storage.managed` is read-only by definition and throws on write
per [MDN WebExtensions storage][mdn-storage].

This skill emits the test suite that proves the right area was
chosen, the quota gates fire on the documented thresholds, and the
`storage.onChanged` payload shape matches across all writing code
paths. The output is a Vitest / Playwright spec file the extension
ships in its test suite.

[cr-storage]: https://developer.chrome.com/docs/extensions/reference/api/storage
[mdn-storage]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage

Composes with:

- [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md) - for the SW-runtime restriction that bans `localStorage` and
  forces all persistent state into `chrome.storage.*`.
- [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md) - the fixture that loads the extension so the spec can call into
  `chrome.storage.*` from a service-worker context.
- [`mv2-to-mv3-migration-test-checklist`](../mv2-to-mv3-migration-test-checklist/SKILL.md) - Section 2 of that checklist forces every `localStorage` call
  through this skill's output.

For Playwright-driven MV3 popup / content-script fixtures see
[`qa-modern-web/browser-extension-tests`](../../../qa-modern-web/skills/browser-extension-tests/SKILL.md).
That skill covers the `chrome.storage` *usage* assertions; this
builder covers the *suite* design - area selection, quota gates,
event-payload conformance, multi-area isolation.

## When to use

- A new extension is deciding `local` vs `sync` vs `session` - 
  generate the decision-matrix test that proves the choice.
- Migrating from `localStorage` to `chrome.storage.local` per the
  MV3 service-worker rules - emit the equivalence test.
- A user-facing bug ("my settings disappeared") that may be a
  quota-exceeded silent drop on `storage.sync` - author the
  quota-boundary test that catches it.
- Adding an enterprise-policy `storage.managed` read path - 
  emit the read-only-error test plus the policy-fixture loader.

## Workflow

### Step 1 - Inventory the access pattern

For each storage call in the extension, capture three facts:

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

The decision is driven by the four facts in Step 1 and the
constants in [cr-storage]:

| Area | QUOTA_BYTES | Per-item | Lifetime | Cross-device | Writer |
|---|---|---|---|---|---|
| `storage.local` | 10,485,760 (10 MB; 5 MB in Chrome 113 and earlier per [cr-storage]) | none documented | until extension removal | no | extension |
| `storage.sync` | 102,400 (~100 KB) | 8,192 (8 KB) | persistent, synced | yes (when user signed in) | extension |
| `storage.session` | 10,485,760 (10 MB; 1 MB in Chrome 111 and earlier per [cr-storage]) | none documented | cleared on disable, reload, update, or browser restart per [cr-storage]; MV3-only | no | extension |
| `storage.managed` | - | - | as long as policy is in effect | varies | **admin only** - read-only for the extension per [cr-storage] |

`storage.sync` also has the write-throughput caps per [cr-storage]:
`MAX_ITEMS = 512`, `MAX_WRITE_OPERATIONS_PER_MINUTE = 120`,
`MAX_WRITE_OPERATIONS_PER_HOUR = 1,800`.

Per [cr-storage]: *"`MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE` for
storage.sync is deprecated: 'The storage.sync API no longer has a
sustained write operation quota.'"* - assertions referencing this
constant should be removed.

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

### Step 3 - Quota-exceeded behavior tests

Per [cr-storage], quota-exceeded writes *"fail immediately and set"*
`runtime.lastError` (callback form) or *"reject the Promise"*
(async form). The test must drive both paths.

Worked test - `storage.sync` per-item quota (8,192 bytes):

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
  // Per cr-storage the exact message is unstable; assert quota-shaped text
  expect(result.message).toMatch(/quota|QUOTA_BYTES/i);
});
```

Worked test - `storage.sync` total-quota (102,400 bytes):

```ts
test('storage.sync rejects past total-quota (~100 KB)', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const result = await sw.evaluate(async () => {
    // 13 items × 8 KB = 104 KB > 102.4 KB total per QUOTA_BYTES
    const batch: Record<string, string> = {};
    const chunk = 'x'.repeat(7.9 * 1024); // just under per-item cap
    for (let i = 0; i < 13; i++) batch[`k${i}`] = chunk;
    try {
      await chrome.storage.sync.set(batch);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });

  expect(result.ok).toBe(false);
});
```

Worked test - callback-path equivalence (per [cr-storage], both
forms must observe quota):

```ts
test('storage.sync callback path also sets runtime.lastError on quota', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const err = await sw.evaluate(() => new Promise<string | null>(resolve => {
    const oversized = 'x'.repeat(9 * 1024);
    chrome.storage.sync.set({ big: oversized }, () => {
      resolve(chrome.runtime.lastError?.message ?? null);
    });
  }));

  expect(err).not.toBeNull();
  expect(err).toMatch(/quota|QUOTA_BYTES/i);
});
```

### Step 4 - `MAX_ITEMS` and write-throughput tests

Per [cr-storage], `storage.sync.MAX_ITEMS = 512`. Write 513 unique
keys, assert the 513th fails:

```ts
test('storage.sync rejects past MAX_ITEMS (512)', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const result = await sw.evaluate(async () => {
    for (let i = 0; i < 512; i++) {
      await chrome.storage.sync.set({ [`k${i}`]: '1' });
    }
    try {
      await chrome.storage.sync.set({ k512: '1' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false };
    }
  });

  expect(result.ok).toBe(false);
});
```

Per-minute throughput (120 writes/min per [cr-storage]) is harder
to test deterministically; the conservative path is to assert the
extension's own write-batching logic stays well below the cap rather
than to drive the cap itself.

### Step 5 - `storage.onChanged` event-payload shape

Per [cr-storage], the signature is:

```
chrome.storage.onChanged.addListener((changes: object, areaName: string) => void)
```

with `changes[key] = { oldValue?, newValue? }`. Tests must assert
both args + payload shape:

```ts
test('storage.onChanged fires with correct shape on local set', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const event = await sw.evaluate(() => new Promise<any>(resolve => {
    chrome.storage.onChanged.addListener(function listener(changes, area) {
      chrome.storage.onChanged.removeListener(listener);
      resolve({ changes, area });
    });
    chrome.storage.local.set({ theme: 'dark' });
  }));

  expect(event.area).toBe('local');
  expect(event.changes.theme.newValue).toBe('dark');
  expect(event.changes.theme.oldValue).toBeUndefined(); // first write
});
```

Per [mdn-storage], the listener receives the same shape on
Firefox; the test runs cross-browser without modification.

### Step 6 - Multi-area isolation test

A write to one area must not appear in another:

```ts
test('storage.local writes are invisible to storage.sync', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const result = await sw.evaluate(async () => {
    await chrome.storage.local.set({ isolated: 'localValue' });
    const { isolated } = await chrome.storage.sync.get('isolated');
    return isolated;
  });

  expect(result).toBeUndefined();
});
```

### Step 7 - `storage.managed` read-only enforcement

Per [cr-storage] and [mdn-storage], `storage.managed` is read-only;
any write attempt rejects. Test:

```ts
test('storage.managed rejects writes', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const result = await sw.evaluate(async () => {
    try {
      await (chrome.storage as any).managed.set({ foo: 'bar' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });

  expect(result.ok).toBe(false);
});
```

Per [mdn-storage]: *"Trying to modify this namespace results in an
error."*

Reading from `storage.managed` requires a deployed enterprise
policy; in CI, mock the read by injecting an
`extensions.managedStorage` policy via the OS-level mechanism
(Windows registry / macOS plist / Linux JSON) - out of scope for
this skill, but the assertion shape is:

```ts
const policy = await chrome.storage.managed.get('apiBaseUrl');
expect(policy.apiBaseUrl).toBe('https://policy-injected-url/');
```

### Step 8 - Firefox-Chrome divergences

Per [mdn-storage] and [cr-storage], the three observable
divergences for tests:

| Concern | Chrome | Firefox | Test action |
|---|---|---|---|
| `storage.sync` quotas | 102,400 / 8,192 / 512 / 1,800 per hour per [cr-storage] | Per [mdn-storage], MDN does not enumerate quota numbers in the high-level page; align tests to the StorageArea sub-page values and verify on Firefox stable |
| `storage.session` MV3-only | Yes per [cr-storage] (Chrome 102+ MV3+) | Yes per [mdn-storage] (MV3-only on Firefox) | Skip session tests when targeting MV2 |
| `storage.managed` availability | Available; admin-configured per OS | Available per [mdn-storage] | Cross-browser test ok; policy injection mechanism differs per OS |
| Sync sign-in | Chrome account required | Firefox account required | Skip sync round-trip tests on machines without sign-in; assert local-fallback behavior instead |

Per [mdn-storage], Firefox's `storage.local` *"persists even when
users clear browsing history/data (unlike `localStorage`)"* - 
useful when authoring a clear-history regression test.

### Step 9 - Emit the suite

Write `tests/storage.spec.ts` covering all eight cells from Steps
2 - 8. Pair with a YAML manifest mapping each spec to the matrix
cell it covers:

```yaml
# tests/storage-coverage.yaml
matrix:
  area_selection:
    - test: "uses storage.sync only for user-preference-sized data"
      ref: cr-storage QUOTA_BYTES_PER_ITEM
    - test: "no storage.session for cross-restart data"
      ref: cr-storage storage.session lifetime
  quota_exceeded:
    - test: "storage.sync per-item quota (>8 KB)"
      ref: cr-storage QUOTA_BYTES_PER_ITEM = 8192
    - test: "storage.sync total quota (>100 KB)"
      ref: cr-storage QUOTA_BYTES = 102400
    - test: "callback path sets runtime.lastError"
      ref: cr-storage "fail immediately and set"
  throughput:
    - test: "MAX_ITEMS = 512"
      ref: cr-storage MAX_ITEMS = 512
  events:
    - test: "onChanged shape (changes, areaName)"
      ref: cr-storage onChanged signature
  isolation:
    - test: "local invisible to sync"
      ref: cr-storage area separation
  managed:
    - test: "managed write rejects"
      ref: mdn-storage "modify this namespace results in an error"
  firefox_parity:
    - test: "storage.session MV3-only on Firefox"
      ref: mdn-storage storage.session MV3-only
```

CI gates on every cell having at least one passing test.

## Worked example: a 4-row suite for a settings extension

For an extension that stores `{ theme: 'dark', apiKey: '...', tabsOpenCount: N }`:

| Key | Area chosen | Reason | Quota test |
|---|---|---|---|
| `theme` | `storage.sync` | User preference; cross-device | 8 KB per-item cap test |
| `apiKey` | `storage.local` | Sensitive - should not leave device per [mdn-storage] *"Storage area is not encrypted - do not use for storing confidential user information"*, but if used, gate on first-party-only | total-quota test |
| `tabsOpenCount` | `storage.session` | Resets each session | session-clears-on-restart test |
| (admin policy URL) | `storage.managed` | Enterprise-only | managed-write-rejects test |

Each row produces one spec from the templates in Steps 2 - 7.

Note from [mdn-storage]: *"Storage area is not encrypted, and
shouldn't store confidential information."* If the extension
stores credentials at all, the suite must include a separate
encryption-at-rest test (out of scope for this storage-API skill).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only happy-path `set` + `get` | Quota silently drops past 8 KB / 100 KB per [cr-storage] | Author quota tests per Step 3 |
| Assert exact error message string | Per [cr-storage], wording isn't pinned; matching `/quota/i` is the stable surface | Use regex match per Step 3 |
| Use `storage.sync` for binary / image data | 100 KB total + 8 KB per-item caps; not designed for blobs | Move to `storage.local` per Step 2 |
| Use `storage.session` for cross-restart data | Cleared on restart per [cr-storage]; tests pass in single session, prod fails on cold start | Step 2 decision matrix |
| Skip `storage.managed` read-only test | Extension's own write code may silently throw in enterprise deployments | Test per Step 7 |
| Assume `MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE` still applies | Deprecated per [cr-storage] - *"no longer has a sustained write operation quota"* | Drop the constant from tests |
| Write a 1 MB value to `storage.local` and assume MV2 limit | Chrome 113- was 5 MB; current is 10 MB per [cr-storage] - pin the test to the live constant, not a hard-coded number |
| Listen for `onChanged` once and expect no further fires | Per [cr-storage] every write fires; listener must filter or accumulate | Always filter on `areaName` + key |

## Limitations

- **Sync round-trip requires sign-in.** Tests asserting that a
  `storage.sync.set` propagates to a second device need both
  profiles signed in to the same Chrome / Firefox account - not
  testable in headless CI without account credentials.
- **`storage.session` is MV3-only** per [cr-storage]; tests in MV2
  contexts must skip or fall back to `storage.local` with a
  cleanup hook.
- **Throughput caps are server-side.** Per [cr-storage] the
  `MAX_WRITE_OPERATIONS_PER_HOUR = 1800` cap is enforced by sync
  servers, not the local client; tests can only assert the
  extension's own batching stays under the cap (Step 4 limitation).
- **Encryption-at-rest is out of scope.** Per [mdn-storage], no
  area encrypts by default; auditing what the extension stores
  requires a separate threat-model test.
- **`storage.managed` policy injection** differs per OS (Windows
  registry, macOS plist, Linux JSON) - CI mocking is platform-
  specific and not covered by this skill's templates.
- **Firefox `storage.sync` quotas** are not enumerated as constants
  on the top-level [mdn-storage] page; Step 8's assertions assume
  Chrome-quota parity per the linked StorageArea sub-page - 
  re-verify on Firefox stable before pinning.

## References

- Chrome - `chrome.storage` API reference (quotas, deprecation
  notices, quota-exceeded behavior) - [cr-storage].
- MDN - WebExtensions storage API (Firefox semantics, managed-area
  read-only quote, encryption caveat) - [mdn-storage].
- Composes:
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md),
  [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md),
  [`mv2-to-mv3-migration-test-checklist`](../mv2-to-mv3-migration-test-checklist/SKILL.md).
- Sibling builder:
  [`mv2-to-mv3-migration-test-checklist`](../mv2-to-mv3-migration-test-checklist/SKILL.md).
