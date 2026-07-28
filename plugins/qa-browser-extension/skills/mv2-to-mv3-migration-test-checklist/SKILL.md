---
name: mv2-to-mv3-migration-test-checklist
description: "Build-an-X workflow that emits a per-extension MV2 → MV3 migration test checklist. Walks the six canonical migration sections (manifest, service worker, API calls, declarative net request, security, publication) per the Chrome migration checklist, then for each one inventories the source MV2 manifest, names the MV3 replacement field / API, and emits the verification test cases. Covers the Firefox-Chrome divergence cells (page_action retained in Firefox, event pages allowed in Firefox 106+, host-permission install-prompt behavior changed in Firefox 127, web_accessible_resources `use_dynamic_url` Chromium-only). Output: a checklist artifact with per-section test cases the migrating extension must pass before publishing the MV3 build. Use when migrating an MV2 extension to Manifest V3 and the team needs section-by-section evidence the migration is complete."
metadata:
  keywords: "manifest-v3, mv2-to-mv3, migration-checklist, service-worker, host-permissions"
---

# mv2-to-mv3-migration-test-checklist

## Overview

MV2 -> MV3 migration silently breaks extensions in ways no single test catches:
a removed `background.scripts` array fails to load, a leftover host pattern in
`permissions[]` drops at runtime, a remote `<script>` tag passes lint but is
blocked by the new CSP. It is testable only by walking the checklist
section-by-section and emitting the verification case per cell - which is what
this builder produces, mapping Chrome's official [Manifest V3 migration
checklist][cr-checklist] to the test that proves each section landed. The
per-section verification matrices and worked test code live in
[references/verification-cases.md](references/verification-cases.md).

[cr-checklist]: https://developer.chrome.com/docs/extensions/develop/migrate/checklist
[cr-mig-overview]: https://developer.chrome.com/docs/extensions/develop/migrate
[cr-manifest]: https://developer.chrome.com/docs/extensions/develop/migrate/manifest
[cr-mig-sw]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
[ff-mig]: https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/

Composes with:

- `manifest-v3-test-surface-reference` - the field-level rename + key-matrix reference this builder
  consults at every step.
- `web-ext-cli-mozilla` - the Firefox-side validator (`web-ext lint`) used to verify each MV3 cell
  against AMO.
- `chrome-extension-test-loader` - the manual Chrome dev-load that surfaces section-level errors
  during checklist walk.

For Playwright-driven MV3 popup / content-script fixtures see
`browser-extension-tests`. That skill assumes the MV3 manifest is *already
valid*; this builder is what proves it before assertion-level tests run.

## When to use

- An MV2 extension is being migrated to MV3 - produce the per-extension
  verification checklist before the migration PR.
- An MV3 build is failing to load with no clear error - walk the six checklist
  sections to localize.
- A Chrome-MV3 extension is being ported to Firefox - the divergence cells flag
  which sections need Firefox-specific tests.
- A reviewer wants section-by-section evidence the migration is complete.

## Workflow

### Step 1 - Inventory the source MV2 manifest

Read the project's `manifest.json` and snapshot the MV2 baseline per
[cr-manifest]. The inventory drives the rest of the workflow - each MV3 checklist
section consumes one or more fields from it.

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

### Step 2 - Walk the six migration sections

For each section, author one test per checklist item. The full per-item
verification matrices and the Section 1 manifest / DNR / CSP code are in
[references/verification-cases.md](references/verification-cases.md).

| Section | What each test proves |
|---|---|
| 1 - Update the manifest | `manifest_version === 3`; host patterns moved to `host_permissions[]`; WAR object-array shape |
| 2 - Migrate to a service worker | `background.service_worker` single string; no DOM / XHR / `localStorage` / timers in SW; synchronous listeners; state survives restart |
| 3 - Update API calls | `scripting.*` replaces `tabs.executeScript` / `insertCSS`; `action` replaces browser/page actions; `web-ext lint` clean |
| 4 - Replace blocking web request | no `webRequestBlocking` in `permissions[]`; DNR `rule_resources[]` shape valid |
| 5 - Improve extension security | no `eval` / arbitrary strings; no remote `<script src>`; CSP object shape without `unsafe-eval` |
| 6 - Publication | beta channel populated; gradual rollout; review-time planning; crash tracking |
| Firefox divergence | `page_action` retained; event pages (Firefox 106+); `use_dynamic_url` absent; host-permission prompts (Firefox 127) |

The signature runtime test - the one migration "passes lint but breaks on first
user" without - is the SW-survival probe. Keep it inline:

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

The 35-second figure is from `manifest-v3-test-surface-reference` (Chrome
auto-suspends idle SWs after ~30s per [cr-mig-sw]).

### Step 3 - Emit the checklist artifact

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

Verify: couple the checklist with a parallel Vitest / Playwright spec that
automates each item, then gate CI on both files passing. If the checklist has a
cell with no backing test, the migration is unproven for that cell - author the
missing test before merging, never check the box by hand.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One catch-all "MV3 migration" test | Section regressions hide inside a green check | One test per checklist item |
| Skip the 35s SW-survival test | Migration "passes" lint but breaks on first user | Always include the timer test (Step 2) |
| Lint-only verification | `web-ext lint` catches manifest issues, not runtime behavior | Pair lint with a runtime spec |
| Treating Firefox + Chrome as one target | `page_action`, event pages, host-prompt timing all differ per [ff-mig] | Per-browser fork per the divergence cells |
| Skipping CSP object-shape assertion | MV2 flat-string CSP silently ignored by MV3 loader; falls back to permissive default | Assert object shape (Section 5) |
| Asserting `chrome.extension.getBackgroundPage()` works in MV3 | API gone - returns undefined or throws | Replace with message passing |
| Allowing remote `<script src>` because lint passes | Lint doesn't always detect; CSP blocks at runtime | Static-grep step (Section 5) |

## Limitations

- **Static-grep is heuristic.** Tools like `setTimeout("...")` and `eval` can be
  obfuscated; the grep tests catch the common cases but should be paired with
  bundler-level AST scans for production confidence.
- **DNR rule semantics** are not equivalence-tested against the old `webRequest`
  listeners - the checklist verifies shape, not that the new rules drop / modify
  the same requests. Behavior equivalence requires a separate test against
  representative traffic.
- **Firefox 126 vs 127 host-permission behavior** is a hard split per [ff-mig];
  the checklist treats 127+ as canonical and notes 126- as a documented caveat
  rather than a separate test cell.
- **`web_accessible_resources.use_dynamic_url`** isn't covered by Firefox's
  `web-ext lint` rules (the key is Chromium-only per [ff-mig]); the Firefox
  divergence test must check manifest shape directly.
- **Keep-alive policy enforcement is server-side.** Per [cr-mig-sw], Chrome
  "reserves the right to take action" against abusive keep-alives - there is no
  client-detectable signal, so the test only verifies the gate, not enforcement.

## References

- Chrome - Manifest V3 migration checklist (the six-section master list this
  builder walks) - [cr-checklist].
- Chrome - Manifest V3 migration overview (baseline platform support, remote-code
  restriction quote) - [cr-mig-overview].
- Chrome - Migrate to a service worker (SW lifecycle, alarms, keep-alive
  policy) - [cr-mig-sw].
- Chrome - Update the manifest (field-level renames, WAR object shape) -
  [cr-manifest].
- Firefox / Extension Workshop - Manifest V3 migration guide (divergence cells,
  host-permission install-prompt behavior, `browser_specific_settings` rename) -
  [ff-mig].
- Per-section verification matrices + worked test code (Section 1 manifest, DNR,
  CSP, publication gates) - [references/verification-cases.md](references/verification-cases.md).
- Composes: `manifest-v3-test-surface-reference`, `web-ext-cli-mozilla`,
  `chrome-extension-test-loader`.
- Sibling builder: `extension-storage-test-author`.
