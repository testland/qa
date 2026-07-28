# Storage test templates - extension-storage-test-author

Full worked templates for the cells summarized in Step 4 of the skill. Each
runs from a `playwright-extension-fixtures` service-worker context; the core
per-item template lives inline in the skill's Step 3.

## Version-specific quota floors

Pin tests to the live constant, never a hard-coded number:

- `storage.local` QUOTA_BYTES: 10 MB now; 5 MB in Chrome 113 and earlier per [cr-storage].
- `storage.session` QUOTA_BYTES: 10 MB now; 1 MB in Chrome 111 and earlier per [cr-storage].
- `MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE`: deprecated - "The storage.sync API no longer has a sustained write operation quota." Remove any assertion on it.

## storage.sync total-quota (102,400 bytes)

```ts
test('storage.sync rejects past total-quota (~100 KB)', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const result = await sw.evaluate(async () => {
    // 13 items x 8 KB = 104 KB > 102.4 KB total per QUOTA_BYTES
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

## Callback-path equivalence

Both forms must observe quota - the callback path sets `runtime.lastError`:

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

## MAX_ITEMS (512)

Write 513 unique keys, assert the 513th fails:

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

Per-minute throughput (120 writes/min) is hard to drive deterministically;
assert the extension's own write-batching stays under the cap instead.

## storage.onChanged event-payload shape

Signature: `chrome.storage.onChanged.addListener((changes, areaName) => void)`
with `changes[key] = { oldValue?, newValue? }`. Firefox receives the same shape
per [mdn-storage], so the test runs cross-browser unmodified:

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

## Multi-area isolation

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

## storage.managed read-only enforcement

`storage.managed` is read-only; any write rejects ("Trying to modify this
namespace results in an error" per [mdn-storage]):

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

Reading `storage.managed` requires a deployed enterprise policy; in CI, inject
an `extensions.managedStorage` policy via the OS mechanism (Windows registry /
macOS plist / Linux JSON) - out of scope here, but the assertion shape is:

```ts
const policy = await chrome.storage.managed.get('apiBaseUrl');
expect(policy.apiBaseUrl).toBe('https://policy-injected-url/');
```

## Firefox-Chrome divergences

| Concern | Chrome | Firefox | Test action |
|---|---|---|---|
| `storage.sync` quotas | 102,400 / 8,192 / 512 / 1,800 per hour per [cr-storage] | Per [mdn-storage], MDN does not enumerate quota numbers in the high-level page; align tests to the StorageArea sub-page values and verify on Firefox stable |
| `storage.session` MV3-only | Yes per [cr-storage] (Chrome 102+ MV3+) | Yes per [mdn-storage] (MV3-only on Firefox) | Skip session tests when targeting MV2 |
| `storage.managed` availability | Available; admin-configured per OS | Available per [mdn-storage] | Cross-browser test ok; policy injection mechanism differs per OS |
| Sync sign-in | Chrome account required | Firefox account required | Skip sync round-trip tests on machines without sign-in; assert local-fallback behavior instead |

Firefox's `storage.local` "persists even when users clear browsing
history/data (unlike `localStorage`)" per [mdn-storage] - useful for a
clear-history regression test.

[cr-storage]: https://developer.chrome.com/docs/extensions/reference/api/storage
[mdn-storage]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage
