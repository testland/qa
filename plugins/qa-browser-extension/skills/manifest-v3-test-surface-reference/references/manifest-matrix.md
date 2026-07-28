# Manifest matrix + field shapes - manifest-v3-test-surface-reference

Deep-lookup detail for the summary tables in SKILL.md: exact MV2/MV3 field
shapes, the full Firefox/Chrome key matrix, and the two service-worker
constructs (offscreen documents, keep-alive). Sources are consolidated in the
link list at the bottom.

## Exact field shapes

### `background`

MV2:

```json
{
  "background": {
    "scripts": ["backgroundContextMenus.js", "backgroundOauth.js"],
    "persistent": false
  }
}
```

MV3:

```json
{
  "background": {
    "service_worker": "service_worker.js",
    "type": "module"
  }
}
```

The MV3 `service_worker` field is a *single string* (not an array); `type` is
optional and only valid as `"module"`. The MV2 `persistent` flag is removed
entirely.

### `host_permissions` split

> "Host permissions in Manifest V3 are a separate field; you don't specify them
> in `"permissions"` or in `"optional_permissions"`."

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

MV2 (flat string array):

```json
"web_accessible_resources": [
  "images/*",
  "style/extension.css",
  "script/extension.js"
]
```

MV3 (array of objects, each scoping resources to URL patterns or extension IDs):

```json
"web_accessible_resources": [
  { "resources": ["images/*"], "matches": ["*://*/*"] },
  {
    "resources": ["style/extension.css", "script/extension.js"],
    "matches": ["https://example.com/*"]
  }
]
```

Test implication: a page-context `fetch(chrome.runtime.getURL('...'))` that
worked under MV2 may 404 under MV3 if the requester's origin isn't covered by a
`matches` pattern.

## Firefox vs Chrome manifest key matrix

Every documented manifest key with Firefox / Chrome availability and MV2 / MV3
status per [mdn-manifest]. Tests must gate on browser detection or split into
per-browser fixtures when a key is "not supported" in one column.

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
| `externally_connectable` | yes | yes | **no** | yes | Cross-origin runtime messaging - Chrome only |
| `host_permissions` | no | yes | yes | yes | New in MV3; permission-prompt test surface |
| `offline_enabled` | yes | yes | **no** | yes | Chrome-only manifest key |
| `optional_host_permissions` | no | yes | yes | yes | Runtime host grants |
| `optional_permissions` | yes | yes | yes | yes | Runtime API grants |
| `permissions` | yes | yes | yes | yes | API permissions only in MV3 |
| `protocol_handlers` | yes | yes | **yes (Firefox only)** | no | Firefox-only register-protocol surface |
| `sidebar_action` | yes | yes | yes (Firefox/Opera) | no | Sidebar UI - not in Chrome |
| `storage` (as manifest key) | yes | yes | **no** | yes | Note: the `storage` *API* works in both |
| `theme_experiment` | yes | yes | **yes (Firefox only)** | no | Experimental theming |
| `user_scripts` (manifest key) | yes | no | yes (MV2 only) | yes (MV2 only) | MV3 replaces with `userScripts` API |
| `web_accessible_resources` | yes | yes | yes | yes | Shape changes (object array in MV3) |

### `browser_specific_settings.gecko`

Firefox-specific metadata (extension ID, min Firefox version) lives under
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

Test note: AMO submission validation requires a stable `gecko.id` for signing -
a test asserting the built zip carries a deterministic ID prevents accidental ID
drift across builds.

## Service-worker constructs

### Offscreen documents

DOM-requiring work in MV3 goes to an offscreen document:

```js
chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: ['CLIPBOARD'],
  justification: 'testing the offscreen API',
});
```

Offscreen documents communicate with the service worker via
`runtime.sendMessage` / `runtime.onMessage` only - they don't share other
extension APIs.

### Keep-alive heartbeat

The keep-alive pattern (calling `chrome.runtime.getPlatformInfo` on a ~25s
interval to reset the idle timer, or writing to `chrome.storage.local` every
20s) is documented but Chrome explicitly limits its use to enterprise/education
managed extensions, "reserves the right to take action" against others, and
notes a `waitUntil()`-style API is under discussion in the W3C WebExtensions
Community Group (WECG).

[cr-mig-manifest]: https://developer.chrome.com/docs/extensions/develop/migrate/manifest
[cr-mig-sw]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
[mdn-manifest]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json
