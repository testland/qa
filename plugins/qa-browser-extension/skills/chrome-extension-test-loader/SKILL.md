---
name: chrome-extension-test-loader
description: "Load an unpacked Chrome / Chromium extension for testing via the `chrome://extensions` Developer-mode flow, then exercise the message-passing surface (chrome.runtime.sendMessage one-shot + return-true async pattern, chrome.tabs.sendMessage, chrome.runtime.connect long-lived ports, externally_connectable from web pages, native messaging). Covers reload semantics (manifest / service worker / content scripts require explicit reload; popup + options page reload on next open), the 64 MiB message size cap, and the JSON-serialization-not-structured-clone payload constraint. Use when scripting a from-scratch developer load of an unpacked Chromium extension and asserting messaging behaviour outside of Playwright. For Playwright-driven MV3 popup / content-script fixtures see `qa-modern-web/browser-extension-tests`. This plugin covers Firefox + Chrome extension lifecycle, MV2 → MV3 migration, host-permission prompts, and `storage.sync` vs `storage.local` semantics."
metadata:
  keywords: "chrome-extension, load-unpacked, chrome-runtime-sendmessage, chrome-runtime-connect, externally-connectable"
---

# chrome-extension-test-loader

## Overview

The unpacked-extension flow is the canonical Chromium developer
test loop per the [Chrome Extensions "Hello World" tutorial][cr-hello]:
toggle Developer mode in `chrome://extensions`, click **Load
unpacked**, point at the source directory containing
`manifest.json`. This is the contract every other test rig
(Playwright fixtures, Puppeteer launchers, CI smoke tests) wraps - 
knowing it directly is what lets you reason about why a fixture
fails, which surface a regression hit, and what a "service-worker
reload" actually re-evaluates.

[cr-hello]: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

This skill covers (a) the manual developer load that mirrors what
`--load-extension` flags automate, and (b) the runtime messaging
surface (`chrome.runtime.sendMessage`, `chrome.runtime.connect`,
`externally_connectable`) every extension test exercises.

For Playwright-driven MV3 popup / content-script fixtures see
`qa-modern-web/browser-extension-tests`.
That skill is a Playwright wrapper for fixture-style testing - this
skill is the lower-level developer flow + the messaging API surface
itself.

Composes with:

- [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)
  for the manifest fields the loader validates.
- [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md)
  for the Playwright fixture pattern that automates this load.

## When to use

- Validating that an extension build directory loads cleanly into
  Chrome before wiring a Playwright fixture.
- Asserting message-passing behaviour (one-shot + long-lived port)
  end-to-end against a real browser.
- Diagnosing a "popup works but content script doesn't" bug - the
  reload table below shows which component reloads on what trigger.
- Exercising the `externally_connectable` allow-list before
  publishing.
- Smoke-testing a cross-extension or native-messaging integration.

## Authoring

### Minimum manifest

Per [cr-hello], the minimum loadable manifest is:

```json
{
  "name": "Hello Extensions",
  "description": "Base Level Extension",
  "version": "1.0",
  "manifest_version": 3,
  "action": {
    "default_popup": "hello.html",
    "default_icon": "hello_extensions.png"
  }
}
```

Required fields: `name`, `version`, `manifest_version` (3 for MV3
per
[`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)).

### Project layout

```
my-extension/
  manifest.json       # MUST live at root
  background.js       # service worker (referenced by manifest.background.service_worker)
  content.js          # content script (referenced by manifest.content_scripts[].js)
  popup/
    popup.html
    popup.js
  options/
    options.html
  icons/
    16.png
    48.png
    128.png
```

Per [cr-hello]: *"the only prerequisite is to place the
manifest.json file in the extension's root directory."*

## Running

### Step 1 - Open `chrome://extensions`

Per [cr-hello]: *"By design `chrome://` URLs are not linkable."*
Three routes to the page:

| Route | Steps |
|---|---|
| Direct | New tab → type `chrome://extensions` → Enter |
| Toolbar | Click the **Extensions** puzzle icon → **Manage Extensions** |
| Menu | Chrome menu → **More Tools** → **Extensions** |

### Step 2 - Toggle Developer mode on

Per [cr-hello], toggle the switch labeled **Developer mode** at the
top-right of the Extensions page. Three buttons appear:
**Load unpacked**, **Pack extension**, **Update**.

### Step 3 - Load unpacked

Per [cr-hello], click **Load unpacked**, then select the extension's
source directory (the one containing `manifest.json`). Chrome
parses the manifest immediately; a malformed manifest produces an
on-page error card.

### Step 4 - Pin the extension to the toolbar

Per [cr-hello]: *"Pin your extension to the toolbar to quickly
access your extension during development."* Click the puzzle-icon
**Extensions** menu, find the row, click the pin icon. The popup
becomes a single-click target.

### Step 5 - Reload after edits

Per [cr-hello], the reload semantics are:

| Component edited | Reload action required |
|---|---|
| `manifest.json` | Click refresh on the extension card |
| Service worker (`background.service_worker`) | Click refresh on the extension card |
| Content scripts | Click refresh on the extension card **plus refresh the host page** |
| Popup HTML/JS | None - next open re-evaluates |
| Options page | None - next open re-evaluates |
| Other extension HTML pages | None |

The "click refresh on the card" gesture is what every test harness
automates via `chrome.management.setEnabled(false)` →
`setEnabled(true)` or by closing and re-launching the persistent
context.

## Exercising the messaging surface

The Chrome messaging API has four shapes per the
[Message passing concepts page][cr-msg]:

[cr-msg]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

1. One-shot **runtime** messages (extension internal).
2. One-shot **tabs** messages (extension → content script).
3. Long-lived **ports** (`chrome.runtime.connect`).
4. **Cross-extension** + **external-page** messages
   (`externally_connectable`).
5. **Native messaging** (`chrome.runtime.connectNative`).

### One-shot runtime messages

Per [cr-msg]:

```js
// Sender (content script)
const response = await chrome.runtime.sendMessage({ greeting: "hello" });

// Listener (service worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message !== 'get-status') return;
  fetch('https://example.com')
    .then(r => sendResponse({ statusCode: r.status }));
  return true;  // keep channel open for async sendResponse
});
```

The `return true` pattern is load-bearing per [cr-msg]:

> "returning `true` will keep the message channel open to the other
> end until `sendResponse` is called."

Chrome 148+ also accepts a returned `Promise` (per [cr-msg]); its
resolved value becomes the response, rejection propagates as a
rejected `sendMessage()` promise on the sender side.

**Gotcha per [cr-msg]:** an `async` listener implicitly returns a
promise. If the body returns no value, the promise resolves
`undefined` and the sender receives `null` - interfering with other
listeners that meant to respond. Author either a non-async listener
with `return true`, or an async one that returns a value.

### One-shot tabs messages

Per [cr-msg]:

```js
chrome.tabs.sendMessage(tab.id, { greeting: "hello" }, response => {
  document.getElementById("resp").innerText = response.farewell;
});
```

Use this from popup / service worker to drive a specific tab's
content script.

### Long-lived ports

Per [cr-msg]:

```js
// Content script
const port = chrome.runtime.connect({ name: "knockknock" });
port.onMessage.addListener(msg => {
  if (msg.question === "Who's there?") port.postMessage({ answer: "Madame" });
});
port.postMessage({ joke: "Knock knock" });

// Service worker
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "knockknock") return;
  port.onMessage.addListener(msg => {
    if (msg.joke === "Knock knock") port.postMessage({ question: "Who's there?" });
  });
});
```

Test assertion targets:

- `port.onDisconnect` fires on tab unload, frame unload, missing
  `onConnect` listener, or explicit `disconnect()` (per [cr-msg]).
- "A port may have multiple receivers" per [cr-msg] - disconnect
  can fire more than once. Tests must accumulate, not assume one.

### Cross-extension / external-page messaging

Per [cr-msg], a web page can send to an extension only if the
extension declares the page's origin in `externally_connectable`:

```json
"externally_connectable": {
  "matches": ["https://*.example.com/*"]
}
```

```js
// Web page → extension
chrome.runtime.sendMessage(editorExtensionId, { openUrlInEditor: url },
  response => { if (!response.success) handleError(url); });

// Extension receives
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (sender.id !== allowlistedExtension) return;
  if (request.getTargetData) sendResponse({ targetData });
});
```

Per [cr-msg]: *"It is not possible to send a message from an
extension to a web page."* Tests asserting the reverse direction
will be looking at custom DOM events or content-script injection.

**Firefox parity note:** per the
[`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)
key matrix, `externally_connectable` is **not supported in
Firefox** - cross-extension flows must be gated on browser
detection.

### Native messaging

Per [cr-msg], extensions can swap messages with a native host
registered as a "native messaging host" via
`chrome.runtime.connectNative(hostName)`. Native messaging requires
a host manifest installed under a per-OS registry path; details
live on the dedicated Native Messaging guide.

## Parsing results

### Manifest load errors

A malformed manifest yields an error card on `chrome://extensions`
with a "Errors" button. Common shapes:

- `Manifest file is missing or unreadable.` - wrong directory selected.
- `Could not load manifest.` - JSON parse error.
- `Required value 'name' is missing or invalid.` - bad shape.
- `Permission 'X' is unknown or URL pattern is malformed.` - invalid
  permission string (often a leftover MV2 host pattern in
  `permissions[]` instead of `host_permissions[]` per
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)).

### Service-worker logs

Inspect via the **Service worker** link on the extension card →
opens a DevTools window scoped to the worker. `console.log`,
network panel, and breakpoints all work.

### Content-script logs

Inspect from the host page's DevTools - content scripts log into
the page's console, not the extension's.

### Message-passing payload constraints

Per [cr-msg]:

> "Messages use **JSON serialization** in Chrome (not structured
> clone). Maximum message size is **64 MiB**."

> "If multiple `onMessage` listeners are registered, only the first
> to respond/reject/throw affects the sender."

Tests asserting message payloads must avoid `Map`, `Set`, typed
arrays, `Date` round-tripping with type preserved, and any object
≥ 64 MiB.

## CI integration

Manual `chrome://extensions` loading isn't CI-friendly - automate via
either:

1. **Chrome flags** (the
   [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md)
   pattern): `--disable-extensions-except=$DIR --load-extension=$DIR`
   on a `launchPersistentContext`.
2. **`web-ext` chromium target** (per
   [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md)):
   `web-ext run --target chromium --chromium-binary ...`.

A minimal CI smoke verifies the build directory loads without a
manifest error before the fixture-driven test job runs.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking the manifest *file* in Load unpacked | Chrome expects the *directory* | Select the parent dir of `manifest.json` per [cr-hello] |
| Editing content script and expecting next page-load to pick it up | Reload required on extension card **and** host page per [cr-hello] | Refresh both |
| Async listener returning no value | Returns `undefined` promise; sender gets `null` per [cr-msg] | Return a value or use `return true` + `sendResponse` |
| Forgetting `return true` for async `sendResponse` | Channel closes; response lost per [cr-msg] | Return `true` synchronously |
| Sending `Map` / `Set` / `Date` via `sendMessage` | JSON-serialized, not structured-clone per [cr-msg] | Convert to plain objects |
| Targeting Firefox with `externally_connectable` | Key not supported in Firefox (see manifest reference) | Use postMessage + content-script bridge instead |
| Assuming pinned-extension state persists across builds | Pin state is profile-local | Re-pin after every fresh-profile launch |

## Limitations

- **Manual UI flow is not scriptable.** The `chrome://extensions`
  page is unautomatable from page-context JavaScript per [cr-hello]
  (`chrome://` URLs aren't linkable / framable). Automation hooks
  into the load via Chrome launch flags, not by clicking the UI.
- **Pinning is profile-state.** A fresh launch loses the pin - 
  tests asserting toolbar interaction must drive the pin or use the
  fallback puzzle-menu route.
- **Service-worker auto-suspend complicates assertions.** Per
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md)
  MV3 service workers terminate idle; long-lived port assertions
  must keep traffic flowing or use `chrome.alarms`.
- **Cross-extension messaging requires both extensions loaded.**
  Tests for `chrome.runtime.sendMessage(otherExtId, ...)` must load
  the recipient extension first.
- **Native messaging needs host install.** The native host registry
  entry must exist on the test machine - CI images need a setup
  step.

## References

- Chrome Extensions - Hello World tutorial (load unpacked, reload
  semantics, pinning) - [cr-hello].
- Chrome Extensions - Get started overview - 
  [developer.chrome.com/docs/extensions/get-started](https://developer.chrome.com/docs/extensions/get-started).
- Chrome Extensions - Message passing concepts - 
  [cr-msg].
- Composes:
  [`manifest-v3-test-surface-reference`](../manifest-v3-test-surface-reference/SKILL.md).
- Sibling:
  [`playwright-extension-fixtures`](../playwright-extension-fixtures/SKILL.md)
  (automates this loader via Playwright fixtures),
  [`web-ext-cli-mozilla`](../web-ext-cli-mozilla/SKILL.md)
  (chromium-target runner).
