---
name: manifest-v3-test-surface-reference
description: "Pure-reference catalog of the Manifest V3 test surface for Firefox + Chromium browser extensions. Maps each manifest field that changed from MV2 (manifest_version, background.service_worker vs background.scripts, action vs browser_action / page_action, host_permissions split, web_accessible_resources object-form, content_security_policy object-form), the runtime restrictions service workers impose (no DOM, no XMLHttpRequest, no localStorage, ephemeral lifecycle, synchronous listener registration, alarms instead of setTimeout), and the Firefox-vs-Chrome key matrix (browser_specific_settings.gecko, externally_connectable / offline_enabled gaps, MV2-only user_scripts manifest key); references/ carry Mozilla's web-ext CLI (lint via addons-linter, run on firefox-desktop / firefox-android / chromium targets, deterministic build, AMO sign). Use as the manifest-surface reference when authoring extension tests across both browsers, or when driving Firefox runs / AMO signing with web-ext."
metadata:
  keywords: "browser-extension, manifest-v3, mv3, firefox-webextensions, chrome-extensions"
---

# manifest-v3-test-surface-reference

## Overview

Manifest V3 (MV3) is the current packaging contract for Chromium-family browser
extensions; Firefox supports it as a peer with a documented divergence list. The
manifest is the *only* declarative input both browsers see - every test surface
(background lifecycle, permission prompt, content-script injection,
web-accessible-resource fetch) hangs off a manifest field. Knowing which field
maps to which runtime behaviour is what lets a test author decide whether a
behaviour is testable in unit, integration, or full-browser scope.

This skill is the **pure reference** consumed by
`playwright-extension-fixtures` (and its reload-matrix / storage-tests
references). The summary tables below are the quick lookup; exact MV2/MV3
field shapes, the full Firefox/Chrome key matrix, and the offscreen-document
+ keep-alive detail live in
[references/manifest-matrix.md](references/manifest-matrix.md); Mozilla's
`web-ext` CLI (Firefox lint / run / build / sign) lives in
[references/web-ext-firefox.md](references/web-ext-firefox.md). All sources
are consolidated in the References section.

For Playwright-driven MV3 popup / content-script fixtures see
`browser-extension-tests` - a Chromium-only popup + content-script +
service-worker-fixture skill. This reference is browser-agnostic,
manifest-field-keyed, and covers the Firefox column explicitly.

## When to use

- Authoring a new MV3 extension test - which manifest fields exist, which
  produce permission prompts, which are Firefox-only.
- Migrating an existing MV2 test suite - the field-for-field rename table.
- Triaging a behaviour gap between Chrome and Firefox - the divergence matrix.
- Reviewing a PR that adds a new manifest field - does it need a Firefox
  counterpart, a host-permission consequence, or a CSP adjustment.

## Manifest fields that change between MV2 and MV3

Summary lookup; the exact MV2/MV3 shapes for `background`, `host_permissions`,
and `web_accessible_resources` are in
[references/manifest-matrix.md](references/manifest-matrix.md).

| Field | MV2 | MV3 | Test implication |
|---|---|---|---|
| `manifest_version` | `2` | `3` | First assertion in any conformance test |
| `background` | `{ "scripts": [...], "persistent": false }` | `{ "service_worker": "sw.js", "type": "module"? }` | Lifecycle test moves from "always running" to "wake on event, terminate idle" |
| `action` / `browser_action` / `page_action` | `browser_action` or `page_action` | `action` (unified) | Popup-rendering tests target the unified `action` slot |
| `permissions` | API + host strings mixed | API strings only | API-permission tests stay; host-permission tests move (see next row) |
| `host_permissions` | (did not exist) | match patterns moved here from `permissions` | Each host pattern is a runtime permission prompt - testable as a user gesture flow |
| `optional_host_permissions` | (did not exist) | runtime-requestable hosts | Tests must drive `permissions.request` from a user gesture |
| `web_accessible_resources` | flat string array | array of `{ resources: [...], matches: [...] }` objects | Cross-origin `fetch` of an extension resource is only allowed from a matching `matches` pattern |
| `content_security_policy` | string | object with `extension_pages` / `sandbox` keys | No inline `<script>`, no remotely hosted code, no `eval` - testable via load-time CSP violations |

## Service-worker runtime restrictions (MV3-only test surface)

The MV3 background context is a service worker - not a persistent page - and
inherits the standard service-worker constraints plus a few extension-specific
ones. The offscreen-document construct and the keep-alive heartbeat are detailed
in [references/manifest-matrix.md](references/manifest-matrix.md).

| Constraint | MV2 | MV3 | Test implication |
|---|---|---|---|
| DOM / `window` | available | unavailable | Anything touching DOM moves to an offscreen document (`chrome.offscreen.createDocument`) |
| `XMLHttpRequest` | available | unavailable - use `fetch()` | XHR-using test fixtures must be rewritten |
| `localStorage` | available | unavailable - use `chrome.storage.local` | Tests asserting persisted state must use `chrome.storage.*` (see `playwright-extension-fixtures` references/storage-tests.md) |
| `setTimeout` / `setInterval` | reliable | cancelled when worker terminates - use `chrome.alarms` | Tests timing background work must use alarms, not timers |
| Listener registration | top-level or async | **must be synchronous at top level** | Async-registered listeners are "not guaranteed to work in Manifest V3" |
| Lifecycle | persistent | ephemeral (start -> run -> terminate, repeated) | Globals reset; storage is source of truth |

Two load-bearing quotes from [cr-mig-sw]: "Registering a listener
asynchronously (for example inside a promise or callback) is not guaranteed to
work in Manifest V3," and "[Service workers] are ephemeral, which means they'll
likely start, run, and terminate repeatedly."

## Firefox vs Chrome manifest key matrix

The full 23-key availability matrix (MV2 / MV3 x Firefox / Chrome) and the
`browser_specific_settings.gecko` example are in
[references/manifest-matrix.md](references/manifest-matrix.md). The divergences
that most often break a cross-browser test:

- `externally_connectable`, `offline_enabled`, `storage` (manifest key) - Chrome
  only; gate Chrome assertions on browser detection.
- `browser_specific_settings` - Firefox requires it (stable `gecko.id` for AMO
  signing); Chrome silently ignores it.
- `protocol_handlers`, `sidebar_action`, `theme_experiment` - Firefox only.
- `user_scripts` (manifest key) - MV2 only; MV3 replaces it with the
  `userScripts` API.
- `page_action` - Firefox keeps a different page-action shape in MV3; Chrome
  drops it for the unified `action`.

## MV3 platform availability

Manifest V3 is supported generally in Chrome 88 or later, with some replacement
APIs landing after 88. `minimum_chrome_version` in the manifest pins a floor for
users on stable channels.

The MV2 deprecation timeline lives on a separate Chrome "Manifest V2 support
timeline" page - cite by stable URL
(`developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline`)
and read live, as dates have shifted multiple times.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Assuming MV3 `permissions` still accepts host match patterns | Lint passes; runtime drops them silently | Move all host patterns to `host_permissions` |
| Testing `background.scripts` array under MV3 | Field doesn't exist in MV3; manifest fails to load | Use `background.service_worker` single string |
| Using `localStorage` in service-worker tests | Throws in MV3 | Use `chrome.storage.local` (see `playwright-extension-fixtures` references/storage-tests.md) |
| Registering `chrome.runtime.onMessage` inside a promise | Listener may not fire after worker restart in MV3 | Register synchronously at top level |
| Testing flat-string `web_accessible_resources` under MV3 | Resources unreachable from page context | Use object form `{ resources, matches }` |
| Treating Firefox MV3 as Chrome MV3 | `externally_connectable`, `offline_enabled` not supported; `browser_specific_settings` required | Run Firefox tests with `web-ext` (see [references/web-ext-firefox.md](references/web-ext-firefox.md)) and gate Chrome-only assertions |
| Using `setTimeout` to delay background work | Cancelled on worker termination | Use `chrome.alarms.create` |
| Polling via 1s heartbeat to keep SW alive | Chrome explicitly limits keepalive abuse | Restructure to event-driven; offscreen document for long DOM work |

## Limitations

- **Firefox MV3 parity is incomplete.** Several MV3 APIs landed on Firefox after
  Chrome; check [MDN's per-API browser-compat tables][mdn-manifest] before
  asserting cross-browser behaviour.
- **`declarativeNetRequest` rule shape detail** lives on a separate Chrome
  migration page (not extracted here) - fetch
  `developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest`
  before authoring rule-equivalence tests.
- **No coverage of `content_security_policy.extension_pages` exact-string
  syntax.** The MV3 `content_security_policy` object shape is documented
  separately at
  `developer.chrome.com/docs/extensions/reference/manifest/content-security-policy`.
- **Edge / Opera / Brave coverage.** Chromium-fork browsers track Chrome's MV3
  timeline but may apply different store-side policies (Edge add-ons store, Opera
  add-ons). Cite the upstream Chrome source and add per-store rerun if needed.

## References

- Chrome - Manifest V3 migration overview - [cr-mig-overview].
- Chrome - Update the manifest (MV2 -> MV3 field rename list) - [cr-mig-manifest].
- Chrome - Migrate to a service worker (background field, SW lifecycle, offscreen
  docs, keepalive) - [cr-mig-sw].
- MDN - WebExtensions manifest.json keys reference (Firefox key matrix,
  `browser_specific_settings`) - [mdn-manifest].
- Field shapes + full key matrix + offscreen / keepalive detail -
  [references/manifest-matrix.md](references/manifest-matrix.md).
- Mozilla `web-ext` CLI (Firefox lint / run / build / sign) -
  [references/web-ext-firefox.md](references/web-ext-firefox.md).
- Consumed by: `playwright-extension-fixtures`.

[cr-mig-overview]: https://developer.chrome.com/docs/extensions/develop/migrate
[cr-mig-manifest]: https://developer.chrome.com/docs/extensions/develop/migrate/manifest
[cr-mig-sw]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
[mdn-manifest]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json
