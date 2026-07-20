---
name: mv2-to-mv3-migration-test-checklist
description: "Build-an-X workflow that emits a per-extension MV2 → MV3 migration test checklist. Walks the six canonical migration sections (manifest, service worker, API calls, declarative net request, security, publication) per the Chrome migration checklist, then for each one inventories the source MV2 manifest, names the MV3 replacement field / API, and emits the verification test cases. Covers the Firefox-Chrome divergence cells (page_action retained in Firefox, event pages allowed in Firefox 106+, host-permission install-prompt behavior changed in Firefox 127, web_accessible_resources `use_dynamic_url` Chromium-only). Output: a checklist artifact with per-section test cases the migrating extension must pass before publishing the MV3 build. Use when migrating an MV2 extension to Manifest V3 and the team needs section-by-section evidence the migration is complete."
metadata:
  keywords: "manifest-v3, mv2-to-mv3, migration-checklist, service-worker, host-permissions"
---

# mv2-to-mv3-migration-test-checklist

## Overview

MV2 → MV3 migration silently breaks extensions in ways no single
test catches: a removed `background.scripts` array fails to load,
a leftover host pattern in `permissions[]` drops at runtime, a
remote `<script>` tag passes lint but is blocked by the new CSP.
The migration is testable only if you walk the checklist
section-by-section and emit the verification cases per cell.

This skill produces that checklist as an artifact, mapping each
section from Chrome's official [Manifest V3 migration
checklist][cr-checklist] to the test cases that prove the section
landed. Output is a per-extension YAML / Markdown file the
migrating team checks off before submitting MV3 to the store.

[cr-checklist]: https://developer.chrome.com/docs/extensions/develop/migrate/checklist
[cr-mig-overview]: https://developer.chrome.com/docs/extensions/develop/migrate
[ff-mig]: https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/

Composes with:

- [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md) - the field-level rename + key-matrix reference this builder
  consults at every step.
- [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md) - the
  Firefox-side validator (`web-ext lint`) used to verify each MV3
  cell against AMO.
- [`chrome-extension-test-loader`](../chrome-extension-test-loader/SKILL.md) - the manual Chrome dev-load that surfaces section-level errors
  during checklist walk.

For Playwright-driven MV3 popup / content-script fixtures see
`browser-extension-tests`.
That skill assumes the MV3 manifest is *already valid*; this
builder is what proves it before assertion-level tests run.

## When to use

- An MV2 extension is being migrated to MV3 - produce the
  per-extension verification checklist before the migration PR.
- An MV3 build is failing to load with no clear error - walk the
  six checklist sections to localize.
- A Chrome-MV3 extension is being ported to Firefox - the
  divergence cells flag which sections need Firefox-specific tests.
- A reviewer wants section-by-section evidence the migration is
  complete.

## Workflow

### Step 1 - Inventory the source MV2 manifest

Read the project's `manifest.json` and capture the MV2 baseline. The
six fields the checklist will need to know about are, per [Update
the manifest][cr-manifest]:

[cr-manifest]: https://developer.chrome.com/docs/extensions/develop/migrate/manifest

```bash
# Snapshot the original
cp manifest.json manifest.mv2.backup.json
jq -r '
  {
    manifest_version: .manifest_version,
    background: .background,
    browser_action: .browser_action,
    page_action: .page_action,
    permissions: .permissions,
    optional_permissions: .optional_permissions,
    web_accessible_resources: .web_accessible_resources,
    content_security_policy: .content_security_policy,
    webRequestBlocking: (.permissions | index("webRequestBlocking") != null)
  }' manifest.json > mv2-inventory.json
```

The inventory drives the rest of the workflow - each MV3 checklist
section consumes one or more fields from this snapshot.

### Step 2 - Section 1: Update the manifest

Per [cr-checklist], the manifest-update section has three items.
Emit a test for each:

| Checklist item | Verification test |
|---|---|
| "Change the manifest version number" | Assert `manifest_version === 3` in built `dist/manifest.json` |
| "Update host permissions" | Assert no entry in `permissions[]` matches `^https?://` or starts with `*://`; all such entries moved to `host_permissions[]` |
| "Update web accessible resources" | Assert `web_accessible_resources` is an array of objects with `resources` + `matches` keys (not flat string array) |

Worked test (Vitest):

```ts
import manifest from '../dist/manifest.json';
import { describe, it, expect } from 'vitest';

describe('MV3 manifest - Section 1', () => {
  it('manifest_version is 3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it('no host patterns left in permissions[]', () => {
    const hostPattern = /^(\*|https?):\/\//;
    const stray = (manifest.permissions ?? []).filter((p: string) =>
      hostPattern.test(p)
    );
    expect(stray).toEqual([]);
  });

  it('web_accessible_resources is object-array shape', () => {
    const war = manifest.web_accessible_resources ?? [];
    for (const entry of war) {
      expect(typeof entry).toBe('object');
      expect(Array.isArray(entry.resources)).toBe(true);
      expect(Array.isArray(entry.matches) || Array.isArray(entry.extension_ids)).toBe(true);
    }
  });
});
```

### Step 3 - Section 2: Migrate to a service worker

Per [cr-checklist], this section has eight items. Each maps to a
runtime assertion against the loaded extension (not just the
manifest):

| Checklist item | Verification test |
|---|---|
| "Update the `background` field in the manifest" | Assert `manifest.background.service_worker` is a single string; `manifest.background.scripts` is absent; `manifest.background.persistent` is absent |
| "Move DOM and window calls to an offscreen document" | Static-grep service worker source for `document.`, `window.`, `XMLHttpRequest` - non-zero matches = test fail |
| "Convert `localStorage` to `chrome.storage.local`" | Static-grep for `localStorage.` in SW source - non-zero matches = test fail |
| "Register listeners synchronously" | Static-grep for `(async)?\s*[^.]\.addListener` inside non-top-level scopes - flag any `addListener` inside an async function body |
| "Replace calls to `XMLHttpRequest()` with global `fetch()`" | Static-grep for `XMLHttpRequest` in extension source - fail if any |
| "Persist states" | Smoke test: after 35s of idle, re-read state from `chrome.storage.local`; assert it survives SW restart |
| "Convert timers to alarms" | Static-grep for `setTimeout`/`setInterval` in SW source; fail if found |
| "Keep the service worker alive (in exceptional cases)" | If a keep-alive ping is present, assert it's gated on managed-policy detection per [Keep the service worker alive][cr-sw-alive] |

[cr-sw-alive]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep-alive

Worked SW-survival test:

```ts
test('chrome.storage.local survives SW restart (35s idle)', async ({ context, extensionId }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  await sw.evaluate(() => chrome.storage.local.set({ migrationProbe: 'value' }));
  await new Promise(r => setTimeout(r, 35_000)); // idle past SW timeout

  // Wake the SW with a no-op evaluate; storage must survive
  const value = await sw.evaluate(async () => {
    const { migrationProbe } = await chrome.storage.local.get('migrationProbe');
    return migrationProbe;
  });
  expect(value).toBe('value');
});
```

The 35-second figure is from
[`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)
(Chrome auto-suspends idle SWs after ~30s per [cr-mig-sw]).

[cr-mig-sw]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers

### Step 4 - Section 3: Update API calls

Per [cr-checklist], the API-update section has six items:

| Checklist item | Verification test |
|---|---|
| "Replace `tabs.executeScript()` with `scripting.executeScript()`" | Static-grep `chrome.tabs.executeScript` / `browser.tabs.executeScript` - fail if found |
| "Replace `tabs.insertCSS()` and `tabs.removeCSS()` with `scripting.insertCSS()` / `scripting.removeCSS()`" | Static-grep `chrome.tabs.(insert|remove)CSS` - fail if found |
| "Replace Browser Actions and Page Actions with Actions" | Assert no `manifest.browser_action` or `manifest.page_action`; assert `manifest.action` present (Chromium) - see Step 7 Firefox divergence |
| "Replace functions that expect a Manifest V2 background context" | Manual review item - assert source has no `chrome.extension.getBackgroundPage()` |
| "Replace callbacks with promises" | Style item - `chrome.*` API calls in MV3 source should use `await` form |
| "Replace unsupported APIs" | Run `web-ext lint` from [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md); any `MV3_UNSUPPORTED_API` warnings = fail |

The `scripting` namespace requires the `"scripting"` permission per
[Chrome scripting API][cr-scripting]; verify the inventory included
it after migration.

[cr-scripting]: https://developer.chrome.com/docs/extensions/reference/api/scripting

### Step 5 - Section 4: Replace blocking web request listeners

Per [cr-checklist], this section has two items:

| Checklist item | Verification test |
|---|---|
| "Update permissions" | Assert no `"webRequestBlocking"` in `permissions[]` (still allowed for enterprise/policy extensions per [cr-mig-overview], but most consumer extensions must drop it) |
| "Create declarative net request rules" | If MV2 used `chrome.webRequest.onBeforeRequest` blocking, assert MV3 ships an equivalent `declarative_net_request.rule_resources[]` entry |

DNR rule schema test:

```ts
test('DNR ruleset is well-formed', () => {
  const dnr = manifest.declarative_net_request;
  expect(dnr).toBeDefined();
  expect(Array.isArray(dnr.rule_resources)).toBe(true);
  for (const rs of dnr.rule_resources) {
    expect(typeof rs.id).toBe('string');
    expect(typeof rs.path).toBe('string');
    expect(typeof rs.enabled).toBe('boolean');
  }
});
```

Per [Chrome declarativeNetRequest API][cr-dnr], each rule resource
must declare `id`, `enabled`, and `path` to a JSON file containing
the rule array.

[cr-dnr]: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

### Step 6 - Section 5: Improve extension security

Per [cr-checklist], four items, all assertable against the built
manifest + source:

| Checklist item | Verification test |
|---|---|
| "Remove execution of arbitrary strings" | Static-grep `eval\|new Function\|setTimeout\(["'\`]\|setInterval\(["'\`]` - fail if any |
| "Remove remotely hosted code" | Static-grep all extension HTML / JS for `<script\s+src="https?://`; only `chrome-extension://` and relative paths allowed |
| "Update content security policy" | Assert `manifest.content_security_policy` is the *object* shape (`{ extension_pages: "...", sandbox: "..." }`), not a flat string |
| "Remove unsupported CSP values" | Assert no `unsafe-eval`, no `unsafe-inline` for scripts, no remote `script-src` hosts in `extension_pages` directive |

CSP shape test:

```ts
it('CSP is MV3 object shape with no unsafe-eval', () => {
  const csp = manifest.content_security_policy;
  expect(typeof csp).toBe('object');
  expect(typeof csp.extension_pages).toBe('string');
  expect(csp.extension_pages).not.toMatch(/unsafe-eval/);
  expect(csp.extension_pages).not.toMatch(/https?:\/\//); // no remote hosts
});
```

Per [cr-mig-overview]: *"Manifest V3 removes support for remotely
hosted code and execution of arbitrary strings."*

### Step 7 - Firefox divergence cells

Per [ff-mig], Firefox MV3 diverges from Chrome MV3 in four
observable ways. Each gets its own conditional test, gated on
target browser:

| Divergence | Firefox MV3 behavior | Test |
|---|---|---|
| `page_action` retention | "Firefox retains the separate `page_action` API and manifest key" per [ff-mig] | If `manifest.page_action` present, run Firefox tests but skip on Chromium |
| Event pages allowed | "Firefox supports non-persistent background pages from Firefox 106 onward" per [ff-mig] | Firefox-only: `manifest.background.scripts` + `persistent: false` is valid (Chrome would reject) |
| `web_accessible_resources.use_dynamic_url` | Firefox does **not** support per [ff-mig] | Assert key absent when targeting Firefox |
| Host-permission install prompts | "From Firefox 127, host permissions listed in `host_permissions` and `content_scripts` are displayed in the install prompt and granted on installation" per [ff-mig] | Firefox `web-ext lint` should not warn; the install flow can be smoke-tested with `web-ext run --target firefox-desktop` |

Note from [ff-mig]: *"if an extension update grants new host
permissions, these are not shown to the user"* - meaning a test
that asserts "new host permissions trigger a re-prompt on update"
will fail on Firefox. Document this as expected.

Per [ff-mig], also rename the deprecated `applications` manifest
key to `browser_specific_settings`, and ensure
`browser_specific_settings.gecko.id` is set for Firefox AMO
publication.

### Step 8 - Emit the checklist artifact

Write the per-extension checklist to `tests/migration-mv3-checklist.md`:

```markdown
# MV3 Migration Checklist - <extension-name>

Generated: <YYYY-MM-DD>
Source MV2 inventory: tests/mv2-inventory.json

## Section 1 - Update the manifest
- [ ] `manifest_version === 3` (test: manifest.spec.ts > "manifest_version is 3")
- [ ] No host patterns in `permissions[]` (test: manifest.spec.ts > "no host patterns left")
- [ ] `web_accessible_resources` object-array shape (test: manifest.spec.ts > "WAR object-array shape")

## Section 2 - Migrate to a service worker
- [ ] `background.service_worker` single string; no `scripts`, no `persistent`
- [ ] No `document.` / `window.` / `XMLHttpRequest` in SW source
- [ ] No `localStorage` in SW source
- [ ] Listeners registered at top level (no addListener inside async)
- [ ] No `XMLHttpRequest` anywhere
- [ ] Storage survives 35s idle (test: sw-survival.spec.ts)
- [ ] No `setTimeout` / `setInterval` in SW source
- [ ] Keep-alive (if present) gated on managed policy

## Section 3 - Update API calls
- [ ] No `tabs.executeScript` / `tabs.insertCSS` / `tabs.removeCSS`
- [ ] No `browser_action` / `page_action` (Chromium); `action` present
- [ ] No `chrome.extension.getBackgroundPage()`
- [ ] `web-ext lint` clean

## Section 4 - Replace blocking web request listeners
- [ ] No `webRequestBlocking` in `permissions[]`
- [ ] DNR `rule_resources[]` valid shape (if blocking needed)

## Section 5 - Improve extension security
- [ ] No `eval` / `new Function` / string-form setTimeout
- [ ] No remote `<script src=>` in extension HTML
- [ ] CSP is object shape, no `unsafe-eval`, no remote hosts

## Section 6 - Firefox divergences (skip if Chromium-only)
- [ ] `browser_specific_settings.gecko.id` present
- [ ] No `applications` key (renamed to `browser_specific_settings`)
- [ ] No `web_accessible_resources[].use_dynamic_url` (Chromium-only)
- [ ] `page_action` decision documented (Firefox retain / Chromium drop)
- [ ] Firefox 127+ install-prompt host-permission behavior tested
```

Couple this checklist file with a parallel Vitest / Playwright
spec file that automates each item, then gate CI on both files
passing.

### Step 9 - Section 6 (publication): rollout gates

Per [cr-checklist] section 6 (publish):

| Checklist item | Verification gate |
|---|---|
| "Publish a beta testing version" | Chrome Web Store beta channel populated; AMO listed channel via `web-ext sign --channel listed` per [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md) |
| "Gradually roll out your release" | Chrome Web Store percentage rollout configured (10% → 50% → 100% over ≥3 days) |
| "Plan for review times" | Calendar block: Chrome review p50 ~24h, p95 ~7d (cite the [Chrome Web Store review timeline][cws-review] live; figures move) |
| "Additional tips" | Track crash reports via the developer dashboard for 7d post-rollout |

[cws-review]: https://developer.chrome.com/docs/webstore/review-process

## Worked example: a 20-line checklist excerpt

For an extension with MV2 manifest:

```json
{
  "manifest_version": 2,
  "background": { "scripts": ["bg.js"], "persistent": false },
  "browser_action": { "default_popup": "popup.html" },
  "permissions": ["tabs", "storage", "https://*.example.com/*", "webRequestBlocking"],
  "web_accessible_resources": ["images/*"]
}
```

The emitted checklist excerpt:

```markdown
# MV3 Migration Checklist - example-extension

## Section 1
- [ ] manifest_version: 2 → 3
- [ ] host pattern "https://*.example.com/*" moved from permissions[] to host_permissions[]
- [ ] web_accessible_resources: ["images/*"] → [{ "resources": ["images/*"], "matches": ["..."] }]

## Section 2
- [ ] background.scripts: ["bg.js"] → background.service_worker: "bg.js"
- [ ] background.persistent removed
- [ ] Audit bg.js for DOM access, XHR, localStorage, top-level addListener

## Section 3
- [ ] browser_action → action

## Section 4
- [ ] webRequestBlocking removed from permissions[]
- [ ] If blocking needed: author DNR ruleset
```

Pair this with the runtime spec file in Step 2 and the CSP / DNR
specs in Steps 5 - 6 for the full verification surface.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One catch-all "MV3 migration" test | Section regressions hide inside a green check | One test per checklist item (Steps 2 - 6) |
| Skip the 35s SW-survival test | Migration "passes" lint but breaks on first user | Always include the timer test (Step 3) |
| Lint-only verification | `web-ext lint` catches manifest issues, not runtime behavior | Pair lint with runtime spec per Step 4 |
| Treating Firefox + Chrome as one target | `page_action`, event pages, host-prompt timing all differ per [ff-mig] | Section 6 (Step 7) per-browser fork |
| Skipping CSP object-shape assertion | MV2 flat-string CSP silently ignored by MV3 loader; falls back to permissive default | Assert object shape per Step 6 |
| Asserting `chrome.extension.getBackgroundPage()` works in MV3 | API gone - returns undefined or throws | Replace with `chrome.runtime.getBackgroundContext` patterns or message passing |
| Allowing remote `<script src>` because lint passes | Lint doesn't always detect; CSP blocks at runtime | Static-grep step in Step 6 |

## Limitations

- **Static-grep is heuristic.** Tools like `setTimeout("...")` and
  `eval` can be obfuscated; the grep tests in Steps 3 and 6 catch
  the common cases but should be paired with bundler-level
  AST scans for production confidence.
- **DNR rule semantics** are not equivalence-tested against the
  old `webRequest` listeners - the checklist only verifies shape,
  not that the new rules drop / modify the same requests. Behavior
  equivalence requires a separate test against representative
  traffic.
- **Firefox 126 vs 127 host-permission behavior** is a hard split
  per [ff-mig]; the checklist treats 127+ as canonical and notes
  126- as a documented caveat rather than a separate test cell.
- **`web_accessible_resources.use_dynamic_url`** isn't covered by
  Firefox's `web-ext lint` rules (the key is Chromium-only per
  [ff-mig]); the Firefox divergence test must check manifest
  shape directly.
- **Keep-alive policy enforcement is server-side.** Per
  [cr-mig-sw], Chrome "reserves the right to take action" against
  abusive keep-alives - there is no client-detectable signal, so
  the test in Step 3 only verifies the gate, not enforcement.

## References

- Chrome - Manifest V3 migration checklist (the six-section
  master list this builder walks) - [cr-checklist].
- Chrome - Manifest V3 migration overview (MV3 baseline platform
  support, remote-code restriction quote) - [cr-mig-overview].
- Chrome - Migrate to a service worker (SW lifecycle, alarms,
  keep-alive policy) - [cr-mig-sw].
- Chrome - Update the manifest (field-level renames, WAR object
  shape) - [cr-manifest].
- Chrome - declarativeNetRequest API (DNR rule resource shape) - 
  [cr-dnr].
- Chrome - Web Store review process (rollout gates) - [cws-review].
- Firefox / Extension Workshop - Manifest V3 migration guide
  (divergence cells, host-permission install-prompt behavior,
  `browser_specific_settings` rename) - [ff-mig].
- Composes:
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md),
  [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md),
  [`chrome-extension-test-loader`](../chrome-extension-test-loader/SKILL.md).
- Sibling builder:
  [`extension-storage-test-author`](../extension-storage-test-author/SKILL.md).
