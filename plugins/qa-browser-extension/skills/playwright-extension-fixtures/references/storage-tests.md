# chrome.storage test suite - area selection, quotas, events

Companion reference for `playwright-extension-fixtures`. Consult when an
extension persists state and no test proves the chosen storage area survives
its quota limits. Every template runs from this fixture's service-worker
context (`sw.evaluate(...)`).

`chrome.storage` has four areas with non-overlapping quotas, persistence
semantics, and enterprise-policy posture. Picking the wrong one is a class of
bug the type checker can't catch: `storage.sync` silently rejects writes past
its limits, `storage.session` evaporates on browser restart, and
`storage.managed` is read-only and throws on write.

[cr-storage]: https://developer.chrome.com/docs/extensions/reference/api/storage
[mdn-storage]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage

## Area decision matrix

All constants per [cr-storage]:

| Area | QUOTA_BYTES | Per-item | Lifetime | Cross-device | Writer |
|---|---|---|---|---|---|
| `storage.local` | 10,485,760 (10 MB) | none documented | until extension removal | no | extension |
| `storage.sync` | 102,400 (~100 KB) | 8,192 (8 KB) | persistent, synced | yes (when user signed in) | extension |
| `storage.session` | 10,485,760 (10 MB) | none documented | cleared on disable, reload, update, or browser restart; MV3-only | no | extension |
| `storage.managed` | - | - | as long as policy is in effect | varies | **admin only** - read-only for the extension |

`storage.sync` throughput caps: `MAX_ITEMS = 512`,
`MAX_WRITE_OPERATIONS_PER_MINUTE = 120`, `MAX_WRITE_OPERATIONS_PER_HOUR = 1,800`.
`MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE` is deprecated ("no longer has a
sustained write operation quota" per [cr-storage]) - drop any assertion on it.

Version-specific floors - pin tests to the live constant, never a hard-coded
number: `storage.local` was 5 MB in Chrome 113 and earlier; `storage.session`
was 1 MB in Chrome 111 and earlier (per [cr-storage]).

## Quota-exceeded template (per-item)

Quota-exceeded writes fail immediately and set `runtime.lastError` (callback
form) or reject the Promise (async form); drive both paths:

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

Callback-path equivalence:

```ts
const err = await sw.evaluate(() => new Promise<string | null>(resolve => {
  const oversized = 'x'.repeat(9 * 1024);
  chrome.storage.sync.set({ big: oversized }, () => {
    resolve(chrome.runtime.lastError?.message ?? null);
  });
}));
expect(err).toMatch(/quota|QUOTA_BYTES/i);
```

## The remaining suite cells

| Test | Asserts |
|---|---|
| `storage.sync` total-quota | a batch write past `QUOTA_BYTES = 102,400` rejects (e.g. 13 items x ~8 KB) |
| `MAX_ITEMS` (512) | the 513th unique key rejects |
| `storage.onChanged` shape | listener receives `(changes, areaName)` with `changes[key] = { oldValue?, newValue? }` - same shape on Firefox per [mdn-storage] |
| multi-area isolation | a `storage.local` write is invisible to `storage.sync.get` |
| `storage.managed` read-only | any `managed.set` rejects ("Trying to modify this namespace results in an error" per [mdn-storage]) |
| session lifetime | `storage.session` data does not survive browser restart |

`storage.onChanged` shape test:

```ts
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
```

## Firefox-Chrome divergences

| Concern | Chrome | Firefox |
|---|---|---|
| `storage.sync` quotas | 102,400 / 8,192 / 512 / 1,800 per hour per [cr-storage] | MDN does not enumerate quota numbers on the high-level page; align to the StorageArea sub-page values and verify on Firefox stable |
| `storage.session` MV3-only | Yes per [cr-storage] | Yes per [mdn-storage] - skip session tests when targeting MV2 |
| `storage.managed` | Available; admin-configured per OS | Available per [mdn-storage]; policy injection mechanism differs per OS |
| Sync sign-in | Chrome account required | Firefox account required - skip sync round-trip tests on machines without sign-in |

Firefox's `storage.local` "persists even when users clear browsing
history/data (unlike `localStorage`)" per [mdn-storage] - useful for a
clear-history regression test.

## Anti-patterns and limits

- **Happy-path-only `set` + `get`** - quota silently drops past 8 KB /
  100 KB; author the quota tests above.
- **Asserting exact error message strings** - wording isn't pinned; match
  `/quota/i`.
- **`storage.sync` for binary / image data** - the 100 KB total + 8 KB
  per-item caps aren't designed for blobs; use `storage.local`.
- **`storage.session` for cross-restart data** - passes in a single
  session, fails in prod on cold start.
- **Hard-coding the `storage.local` limit** - read the live constant, not a
  literal (5 MB vs 10 MB across Chrome versions).
- Per [mdn-storage], no area encrypts at rest ("Storage area is not
  encrypted, and shouldn't store confidential information").
- Sync round-trip propagation needs two signed-in profiles - not testable
  in headless CI without account credentials.
- Throughput caps are enforced server-side; tests can only assert the
  extension's own batching stays under the cap.

## References

- Chrome `chrome.storage` API reference (quotas, deprecations,
  quota-exceeded behavior) - [cr-storage].
- MDN WebExtensions storage API (Firefox semantics, managed read-only,
  encryption caveat) - [mdn-storage].
