# Verification cases - mv2-to-mv3-migration-test-checklist

Per-item verification matrices and worked test code for the six migration
sections plus the Firefox divergence cells. The skill's Step 2 walks these; the
SW-survival core test lives inline in SKILL.md Step 2. Sources are in the link
list at the bottom.

## Section 1 - Update the manifest

Per [cr-checklist], three items:

| Checklist item | Verification test |
|---|---|
| "Change the manifest version number" | Assert `manifest_version === 3` in built `dist/manifest.json` |
| "Update host permissions" | Assert no entry in `permissions[]` matches `^https?://` or starts with `*://`; all such entries moved to `host_permissions[]` |
| "Update web accessible resources" | Assert `web_accessible_resources` is an array of objects with `resources` + `matches` keys (not flat string array) |

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

## Section 2 - Migrate to a service worker

Per [cr-checklist], eight items; each maps to a runtime assertion against the
loaded extension (not just the manifest). The SW-survival test for the "Persist
states" item is in SKILL.md Step 2.

| Checklist item | Verification test |
|---|---|
| "Update the `background` field in the manifest" | Assert `manifest.background.service_worker` is a single string; `scripts` and `persistent` are absent |
| "Move DOM and window calls to an offscreen document" | Static-grep SW source for `document.`, `window.`, `XMLHttpRequest` - non-zero matches = fail |
| "Convert `localStorage` to `chrome.storage.local`" | Static-grep for `localStorage.` in SW source - non-zero matches = fail |
| "Register listeners synchronously" | Static-grep for `(async)?\s*[^.]\.addListener` inside non-top-level scopes - flag any `addListener` inside an async body |
| "Replace calls to `XMLHttpRequest()` with global `fetch()`" | Static-grep for `XMLHttpRequest` in extension source - fail if any |
| "Persist states" | Smoke test: after 35s idle, re-read state from `chrome.storage.local`; assert it survives SW restart |
| "Convert timers to alarms" | Static-grep for `setTimeout`/`setInterval` in SW source; fail if found |
| "Keep the service worker alive (in exceptional cases)" | If a keep-alive ping is present, assert it's gated on managed-policy detection per [cr-sw-alive] |

## Section 3 - Update API calls

Per [cr-checklist], six items:

| Checklist item | Verification test |
|---|---|
| "Replace `tabs.executeScript()` with `scripting.executeScript()`" | Static-grep `chrome.tabs.executeScript` / `browser.tabs.executeScript` - fail if found |
| "Replace `tabs.insertCSS()` and `tabs.removeCSS()`" | Static-grep `chrome.tabs.(insert|remove)CSS` - fail if found |
| "Replace Browser Actions and Page Actions with Actions" | Assert no `manifest.browser_action` or `manifest.page_action`; assert `manifest.action` present (Chromium) - see Firefox divergence |
| "Replace functions that expect a Manifest V2 background context" | Manual review - assert source has no `chrome.extension.getBackgroundPage()` |
| "Replace callbacks with promises" | Style item - `chrome.*` API calls in MV3 source should use `await` form |
| "Replace unsupported APIs" | Run `web-ext lint` from `web-ext-cli-mozilla`; any `MV3_UNSUPPORTED_API` warnings = fail |

The `scripting` namespace requires the `"scripting"` permission per
[cr-scripting]; verify the inventory included it after migration.

## Section 4 - Replace blocking web request listeners

Per [cr-checklist], two items:

| Checklist item | Verification test |
|---|---|
| "Update permissions" | Assert no `"webRequestBlocking"` in `permissions[]` (still allowed for enterprise/policy extensions per [cr-mig-overview], but most consumer extensions must drop it) |
| "Create declarative net request rules" | If MV2 used `chrome.webRequest.onBeforeRequest` blocking, assert MV3 ships an equivalent `declarative_net_request.rule_resources[]` entry |

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

Per [cr-dnr], each rule resource must declare `id`, `enabled`, and `path` to a
JSON file containing the rule array.

## Section 5 - Improve extension security

Per [cr-checklist], four items, all assertable against the built manifest + source:

| Checklist item | Verification test |
|---|---|
| "Remove execution of arbitrary strings" | Static-grep `eval\|new Function\|setTimeout\(["'\`]\|setInterval\(["'\`]` - fail if any |
| "Remove remotely hosted code" | Static-grep all extension HTML / JS for `<script\s+src="https?://`; only `chrome-extension://` and relative paths allowed |
| "Update content security policy" | Assert `manifest.content_security_policy` is the *object* shape (`{ extension_pages, sandbox }`), not a flat string |
| "Remove unsupported CSP values" | Assert no `unsafe-eval`, no `unsafe-inline` for scripts, no remote `script-src` hosts in `extension_pages` |

```ts
it('CSP is MV3 object shape with no unsafe-eval', () => {
  const csp = manifest.content_security_policy;
  expect(typeof csp).toBe('object');
  expect(typeof csp.extension_pages).toBe('string');
  expect(csp.extension_pages).not.toMatch(/unsafe-eval/);
  expect(csp.extension_pages).not.toMatch(/https?:\/\//); // no remote hosts
});
```

Per [cr-mig-overview]: "Manifest V3 removes support for remotely hosted code and
execution of arbitrary strings."

## Firefox divergence cells

Per [ff-mig], Firefox MV3 diverges from Chrome MV3 in four observable ways; each
gets its own conditional test, gated on target browser:

| Divergence | Firefox MV3 behavior | Test |
|---|---|---|
| `page_action` retention | Firefox retains the separate `page_action` API and manifest key | If `manifest.page_action` present, run Firefox tests but skip on Chromium |
| Event pages allowed | Firefox supports non-persistent background pages from Firefox 106 onward | Firefox-only: `background.scripts` + `persistent: false` is valid (Chrome rejects) |
| `web_accessible_resources.use_dynamic_url` | Firefox does **not** support it | Assert key absent when targeting Firefox |
| Host-permission install prompts | From Firefox 127, host permissions in `host_permissions` and `content_scripts` are shown in the install prompt and granted on installation | Firefox `web-ext lint` should not warn; smoke-test the install flow with `web-ext run --target firefox-desktop` |

Notes from [ff-mig]: "if an extension update grants new host permissions, these
are not shown to the user" - a test asserting "new host permissions trigger a
re-prompt on update" will fail on Firefox; document as expected. Also rename the
deprecated `applications` manifest key to `browser_specific_settings`, and ensure
`browser_specific_settings.gecko.id` is set for Firefox AMO publication.

## Section 6 - Publication rollout gates

Per [cr-checklist] section 6 (publish):

| Checklist item | Verification gate |
|---|---|
| "Publish a beta testing version" | Chrome Web Store beta channel populated; AMO listed channel via `web-ext sign --channel listed` per `web-ext-cli-mozilla` |
| "Gradually roll out your release" | Chrome Web Store percentage rollout configured (10% -> 50% -> 100% over >=3 days) |
| "Plan for review times" | Calendar block: Chrome review p50 ~24h, p95 ~7d (cite the [Chrome Web Store review timeline][cws-review] live; figures move) |
| "Additional tips" | Track crash reports via the developer dashboard for 7d post-rollout |

[cr-checklist]: https://developer.chrome.com/docs/extensions/develop/migrate/checklist
[cr-manifest]: https://developer.chrome.com/docs/extensions/develop/migrate/manifest
[cr-mig-overview]: https://developer.chrome.com/docs/extensions/develop/migrate
[cr-mig-sw]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
[cr-sw-alive]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep-alive
[cr-scripting]: https://developer.chrome.com/docs/extensions/reference/api/scripting
[cr-dnr]: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
[cws-review]: https://developer.chrome.com/docs/webstore/review-process
[ff-mig]: https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/
