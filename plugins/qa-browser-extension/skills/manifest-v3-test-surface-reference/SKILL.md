---
name: manifest-v3-test-surface-reference
description: "Pure-reference catalog of the Manifest V3 test surface for Firefox + Chromium browser extensions. Maps each manifest field that changed from MV2 (manifest_version, background.service_worker vs background.scripts, action vs browser_action / page_action, host_permissions split, web_accessible_resources object-form, content_security_policy object-form), the runtime restrictions service workers impose (no DOM, no XMLHttpRequest, no localStorage, ephemeral lifecycle, synchronous listener registration, alarms instead of setTimeout), and the Firefox-vs-Chrome key matrix (browser_specific_settings.gecko, externally_connectable / offline_enabled gaps, MV2-only user_scripts manifest key). Use as the manifest-surface reference when authoring extension tests across both browsers."
rating: 24
d6: 4
archetype: S2
keywords:
  - browser-extension
  - manifest-v3
  - mv3
  - firefox-webextensions
  - chrome-extensions
---

# manifest-v3-test-surface-reference

## Overview

Manifest V3 (MV3) is the current packaging contract for Chromium-
family browser extensions; Firefox supports it as a peer with a
documented divergence list. The manifest is the *only* declarative
input both browsers see — every test surface (background lifecycle,
permission prompt, content-script injection, web-accessible-resource
fetch) hangs off a manifest field. Knowing which field maps to which
runtime behaviour is what lets a test author decide whether a
behaviour is testable in unit, integration, or full-browser scope.

This skill is the **pure reference** consumed by the per-tool S1
wrappers in this plugin (`web-ext-cli-mozilla`,
`chrome-extension-test-loader`, `playwright-extension-fixtures`) and
the two S3 builders (`mv2-to-mv3-migration-test-checklist`,
`extension-storage-test-author`).

For Playwright-driven MV3 popup / content-script fixtures see
[`qa-modern-web/browser-extension-tests`](../../../qa-modern-web/skills/browser-extension-tests/SKILL.md).
That skill is a Chromium-only, popup + content-script + service-
worker-fixture S1. This reference is browser-agnostic, manifest-
field-keyed, and covers the Firefox column explicitly.

## When to use

- Authoring a new MV3 extension test — which manifest fields exist,
  which produce permission prompts, which are Firefox-only.
- Migrating an existing MV2 test suite — the field-for-field rename
  table.
- Triaging a behaviour gap between Chrome and Firefox — the
  divergence matrix.
- Reviewing a PR that adds a new manifest field — does it need a
  Firefox counterpart, a host-permission consequence, or a CSP
  adjustment.

## The manifest fields that change between MV2 and MV3

Per [Update the manifest][cr-mig-manifest] and
[Manifest V3 migration overview][cr-mig-overview]:

[cr-mig-manifest]: https://developer.chrome.com/docs/extensions/develop/migrate/manifest
[cr-mig-overview]: https://developer.chrome.com/docs/extensions/develop/migrate

| Field | MV2 | MV3 | Test implication |
|---|---|---|---|
| `manifest_version` | `2` | `3` | First assertion in any conformance test |
| `background` | `{ "scripts": [...], "persistent": false }` | `{ "service_worker": "sw.js", "type": "module"? }` | Lifecycle test moves from "always running" to "wake on event, terminate idle" |
| `action` / `browser_action` / `page_action` | `browser_action` or `page_action` | `action` (unified) | Popup-rendering tests target the unified `action` slot |
| `permissions` | API + host strings mixed | API strings only | API-permission tests stay; host-permission tests move (see next row) |
| `host_permissions` | (did not exist) | match patterns moved here from `permissions` | Each host pattern is a runtime permission prompt — testable as a user gesture flow |
| `optional_host_permissions` | (did not exist) | runtime-requestable hosts | Tests must drive `permissions.request` from a user gesture |
| `web_accessible_resources` | flat string array | array of `{ resources: [...], matches: [...] }` objects | Cross-origin `fetch` of an extension resource is only allowed from a matching `matches` pattern |
| `content_security_policy` | string | object with `extension_pages` / `sandbox` keys | No inline `<script>`, no remotely hosted code, no `eval` — testable via load-time CSP violations |

### `background` field — exact shape

MV2 (per [Update the manifest][cr-mig-manifest] and
[Migrate to a service worker][cr-mig-sw]):

[cr-mig-sw]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers

```json
{
  "background": {
    "scripts": ["backgroundContextMenus.js", "backgroundOauth.js"],
    "persistent": false
  }
}
```

MV3 (per [Migrate to a service worker][cr-mig-sw]):

```json
{
  "background": {
    "service_worker": "service_worker.js",
    "type": "module"
  }
}
```

The MV3 `service_worker` field is a *single string* (not an array);
`type` is optional and only valid as `"module"`. The MV2 `persistent`
flag is removed entirely.

### `host_permissions` split

Per [Update the manifest][cr-mig-manifest]:

> "Host permissions in Manifest V3 are a separate field; you don't
> specify them in `"permissions"` or in `"optional_permissions"`."

MV2:

```json
"permissions": ["tabs", "bookmarks", "https://www.blogger.com/"],
"optional_permissions": ["unlimitedStorage", "*://*/*"]
```

MV3:

```json
"permissions": ["tabs", "bookmarks"],
"optional_permissions": ["unlimitedStorage"],
"host_permissions": ["https://www.blogger.com/"],
"optional_host_permissions": ["*://*/*"]
```

`"content_scripts[].matches"` is **unchanged** between MV2 and MV3.

### `web_accessible_resources` shape change

Per [Update the manifest][cr-mig-manifest]:

MV2 (flat string array):

```json
"web_accessible_resources": [
  "images/*",
  "style/extension.css",
  "script/extension.js"
]
```

MV3 (array of objects, each scoping resources to URL patterns or
extension IDs):

```json
"web_accessible_resources": [
  { "resources": ["images/*"], "matches": ["*://*/*"] },
  {
    "resources": ["style/extension.css", "script/extension.js"],
    "matches": ["https://example.com/*"]
  }
]
```

Test implication: a page-context `fetch(chrome.runtime.getURL('...'))`
that worked under MV2 may 404 under MV3 if the requester's origin
isn't covered by a `matches` pattern.

## Service-worker runtime restrictions (MV3-only test surface)

Per [Migrate to a service worker][cr-mig-sw], the background context
in MV3 is a service worker — not a persistent page — and inherits
the standard service-worker constraints plus a few extension-specific
ones:

| Constraint | MV2 | MV3 | Test implication |
|---|---|---|---|
| DOM / `window` | available | unavailable | Anything touching DOM moves to an offscreen document (`chrome.offscreen.createDocument`) |
| `XMLHttpRequest` | available | unavailable — use `fetch()` | XHR-using test fixtures must be rewritten |
| `localStorage` | available | unavailable — use `chrome.storage.local` | Tests asserting persisted state must use `chrome.storage.*` (see `extension-storage-test-author`) |
| `setTimeout` / `setInterval` | reliable | cancelled when worker terminates — use `chrome.alarms` | Tests timing background work must use alarms, not timers |
| Listener registration | top-level or async | **must be synchronous at top level** | Async-registered listeners are "not guaranteed to work in Manifest V3" |
| Lifecycle | persistent | ephemeral (start → run → terminate, repeated) | Globals reset; storage is source of truth |

Quote from [Migrate to a service worker][cr-mig-sw]:

> "Registering a listener asynchronously (for example inside a
> promise or callback) is not guaranteed to work in Manifest V3."

> "[Service workers] are ephemeral, which means they'll likely
> start, run, and terminate repeatedly."

The keep-alive heartbeat pattern (calling `chrome.runtime.getPlatformInfo`
on a ~25s interval to reset the idle timer, or writing to
`chrome.storage.local` every 20s) is documented but
[Chrome explicitly limits its use][cr-mig-sw] to enterprise/education
managed extensions, "reserves the right to take action" against
others, and notes a `waitUntil()`-style API is under discussion in
the W3C WebExtensions Community Group (WECG).

### Offscreen documents

Per [Migrate to a service worker][cr-mig-sw], DOM-requiring work in
MV3 goes to an offscreen document:

```js
chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: ['CLIPBOARD'],
  justification: 'testing the offscreen API',
});
```

Offscreen documents communicate with the service worker via
`runtime.sendMessage` / `runtime.onMessage` only — they don't share
other extension APIs.

## Firefox vs Chrome manifest key matrix

Per [MDN manifest.json keys reference][mdn-manifest], the table
below enumerates every documented manifest key with its
Firefox / Chrome availability and MV2 / MV3 status. Tests must
either gate on browser detection or split into per-browser fixtures
when the key appears as "not supported" in one column.

[mdn-manifest]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json

| Key | MV2 | MV3 | Firefox | Chrome | Test note |
|---|---|---|---|---|---|
| `manifest_version` | yes | yes | yes | yes | Mandatory; first assertion |
| `name` | yes | yes | yes | yes | Mandatory |
| `version` | yes | yes | yes | yes | Mandatory; semver in Firefox AMO |
| `action` | no | yes | yes | yes | Unified popup slot |
| `browser_action` | yes | no | yes (MV2 only) | yes (MV2 only) | Renames to `action` in MV3 |
| `page_action` | yes | no | yes (MV2; different in MV3) | yes (MV2 only) | Firefox keeps a different page-action shape |
| `background` | yes | yes | yes | yes | Shape changes per above |
| `browser_specific_settings` | yes | yes | yes | **no** | Tests asserting extension ID stability rely on this in Firefox |
| `content_scripts` | yes | yes | yes | yes | Same shape |
| `content_security_policy` | yes | yes | yes | yes | Shape changes (object in MV3) |
| `declarative_net_request` | yes | yes | yes | yes | Replaces `webRequest`-blocking surface |
| `externally_connectable` | yes | yes | **no** | yes | Cross-origin runtime messaging — Chrome only |
| `host_permissions` | no | yes | yes | yes | New in MV3; permission-prompt test surface |
| `offline_enabled` | yes | yes | **no** | yes | Chrome-only manifest key |
| `optional_host_permissions` | no | yes | yes | yes | Runtime host grants |
| `optional_permissions` | yes | yes | yes | yes | Runtime API grants |
| `permissions` | yes | yes | yes | yes | API permissions only in MV3 |
| `protocol_handlers` | yes | yes | **yes (Firefox only)** | no | Firefox-only register-protocol surface |
| `sidebar_action` | yes | yes | yes (Firefox/Opera) | no | Sidebar UI — not in Chrome |
| `storage` (as manifest key) | yes | yes | **no** | yes | Note: the `storage` *API* works in both |
| `theme_experiment` | yes | yes | **yes (Firefox only)** | no | Experimental theming |
| `user_scripts` (manifest key) | yes | no | yes (MV2 only) | yes (MV2 only) | MV3 replaces with `userScripts` API |
| `web_accessible_resources` | yes | yes | yes | yes | Shape changes (object array in MV3) |

### `browser_specific_settings.gecko`

Per [MDN manifest.json keys reference][mdn-manifest], Firefox-
specific metadata (extension ID, min Firefox version) lives under
`browser_specific_settings.gecko`. Chrome silently ignores this key:

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "@addon-example",
      "strict_min_version": "42.0"
    }
  }
}
```

Test note: AMO ([addons.mozilla.org]) submission validation requires
a stable `gecko.id` for signing — a test asserting that the built
zip carries a deterministic ID prevents accidental ID drift across
builds.

## MV3 platform availability

Per [Manifest V3 migration overview][cr-mig-overview]: *"Manifest V3
is supported generally in Chrome 88 or later"*, with some
replacement APIs landing after 88. `minimum_chrome_version` in the
manifest pins a floor for users on stable channels.

The MV2 deprecation timeline itself lives on a separate Chrome
"Manifest V2 support timeline" page — cite by stable URL
(`developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline`)
and read live, as dates have shifted multiple times.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Assuming MV3 `permissions` still accepts host match patterns | Lint passes; runtime drops them silently | Move all host patterns to `host_permissions` per [cr-mig-manifest] |
| Testing `background.scripts` array under MV3 | Field doesn't exist in MV3; manifest fails to load | Use `background.service_worker` single string per [cr-mig-sw] |
| Using `localStorage` in service-worker tests | Throws in MV3 | Use `chrome.storage.local` (see `extension-storage-test-author`) |
| Registering `chrome.runtime.onMessage` inside a promise | Listener may not fire after worker restart in MV3 | Register synchronously at top level per [cr-mig-sw] |
| Testing flat-string `web_accessible_resources` under MV3 | Resources unreachable from page context | Use object form `{ resources, matches }` per [cr-mig-manifest] |
| Treating Firefox MV3 as Chrome MV3 | `externally_connectable`, `offline_enabled` not supported; `browser_specific_settings` required | Run Firefox tests with `web-ext` (see `web-ext-cli-mozilla`) and gate Chrome-only assertions |
| Using `setTimeout` to delay background work | Cancelled on worker termination | Use `chrome.alarms.create` per [cr-mig-sw] |
| Polling via 1s heartbeat to keep SW alive | Chrome explicitly limits keepalive abuse | Restructure to event-driven; offscreen document for long DOM work |

## Limitations

- **Firefox MV3 parity is incomplete.** Several MV3 APIs landed on
  Firefox after Chrome; check [MDN's per-API browser-compat
  tables][mdn-manifest] before asserting cross-browser behaviour.
- **`declarativeNetRequest` rule shape detail** lives on a separate
  Chrome migration page (not extracted here) — fetch
  `developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest`
  before authoring rule-equivalence tests.
- **No coverage of `content_security_policy.extension_pages`
  exact-string syntax.** The MV3 `content_security_policy` object
  shape is documented separately at
  `developer.chrome.com/docs/extensions/reference/manifest/content-security-policy`.
- **Edge / Opera / Brave coverage.** Chromium-fork browsers track
  Chrome's MV3 timeline but may apply different store-side policies
  (Edge add-ons store, Opera add-ons). Cite the upstream Chrome
  source and add per-store rerun if needed.

## References

- Chrome MV3 migration overview —
  [developer.chrome.com/docs/extensions/develop/migrate][cr-mig-overview].
- Chrome — Update the manifest (MV2 → MV3 manifest field rename
  list) — [developer.chrome.com/docs/extensions/develop/migrate/manifest][cr-mig-manifest].
- Chrome — Migrate to a service worker (background field, SW
  lifecycle, offscreen docs, keepalive) —
  [developer.chrome.com/docs/extensions/develop/migrate/to-service-workers][cr-mig-sw].
- MDN WebExtensions manifest.json keys reference (Firefox key
  matrix, `browser_specific_settings`) — [mdn-manifest].
- Consumed by:
  [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md),
  [`chrome-extension-test-loader`](../chrome-extension-test-loader/SKILL.md),
  [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md),
  [`mv2-to-mv3-migration-test-checklist`](../mv2-to-mv3-migration-test-checklist/SKILL.md),
  [`extension-storage-test-author`](../extension-storage-test-author/SKILL.md).
