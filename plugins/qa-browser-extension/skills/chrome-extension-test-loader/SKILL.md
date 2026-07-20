---
name: chrome-extension-test-loader
description: "Loads an unpacked Chrome / Chromium extension for testing through the `chrome://extensions` Developer-mode flow: the minimum loadable `manifest.json`, the Load-unpacked directory-not-file selection, toolbar pinning, and the reload matrix deciding what a code edit actually re-evaluates (`manifest.json`, the background service worker, and content scripts need an explicit card refresh, content scripts additionally need a host-page refresh, while popup / options / other extension HTML pages re-evaluate on next open). Also covers reading the red Errors card, where service-worker and content-script logs surface, and the `--load-extension` and `web-ext --target chromium` equivalents that move the same load into CI. Scope is getting a build directory loaded and reloaded, not the runtime behaviour asserted afterwards. Use when a freshly built extension directory has to go into Chrome for the first time, or when an edit appears to have no effect and you need to know which surface requires an explicit reload."
metadata:
  keywords: "chrome-extension, load-unpacked, extension-reload, chrome-extensions-page, web-ext-chromium"
---

# chrome-extension-test-loader

## Overview

The unpacked-extension flow is the canonical Chromium developer test
loop per the [Chrome Extensions "Hello World" tutorial][cr-hello]:
toggle Developer mode in `chrome://extensions`, click **Load
unpacked**, point at the source directory containing `manifest.json`.

Automated launchers reproduce this same load through browser launch
flags rather than the UI (see CI integration below). Knowing the
manual flow directly is what lets you reason about why a launcher
fails to see the extension, which surface a regression hit, and what a
"service worker reload" actually re-evaluates.

[cr-hello]: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

## Scope boundary

This skill owns **installation and re-installation of the extension
build output**: manifest shape sufficient to load, the developer load
gesture, the reload matrix, the log and error surfaces that tell you
the load succeeded, and the CI equivalents of the manual gesture.

It deliberately does **not** cover what the extension does once it is
running. Assertions about `chrome.runtime` / `chrome.tabs` messaging,
storage quotas, permission prompts, or DOM effects of content scripts
are a separate job with a separate failure mode: those tests fail with
a live extension, whereas everything here fails before the extension
is live at all. If the extension appears on `chrome://extensions` with
no error card, this skill's job is done.

## When to use

- A build directory has just been produced and nobody has confirmed
  Chrome will accept it.
- An edit to source appears to have no effect and you need to know
  which component requires an explicit reload.
- A CI job needs to fail fast on a manifest regression before the
  slower behavioural test job runs.
- A test rig reports "extension not found" and you need to confirm the
  load path itself, independent of the test code.

## Authoring

### Minimum loadable manifest

Per [cr-hello], the minimum manifest that loads is:

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

`manifest_version: 3` is the value carried by the tutorial's minimum
manifest per [cr-hello]. `version` is validated at load time: Chrome
rejects a bad one with `Required value version is
missing or invalid. It must be between 1-4 dot-separated integers each
between 0 and 65536.` per the
[Debug your extension tutorial][cr-debug].

[cr-debug]: https://developer.chrome.com/docs/extensions/get-started/tutorial/debug

### Project layout

```
my-extension/
  manifest.json       # MUST live at root
  background.js       # service worker (manifest.background.service_worker)
  content.js          # content script (manifest.content_scripts[].js)
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

Per [cr-hello]: *"The only prerequisite is to place the manifest.json
file in the extension's root directory."* The directory you select in
the next step is `my-extension/`, not `my-extension/manifest.json`.

## Running

### Step 1 - Open `chrome://extensions`

Per [cr-hello]: *"By design `chrome://` URLs are not linkable."* Three
routes to the page:

| Route | Steps |
|---|---|
| Direct | New tab, type `chrome://extensions`, press Enter |
| Toolbar | Click the **Extensions** puzzle icon, then **Manage Extensions** |
| Menu | Chrome menu, **More Tools**, **Extensions** |

### Step 2 - Toggle Developer mode on

Per [cr-hello], click the toggle switch labelled **Developer mode** at
the top-right of the Extensions page. Three buttons appear: **Load
unpacked**, **Pack extension**, **Update**.

### Step 3 - Load unpacked

Per [cr-hello], click **Load unpacked**, then select the extension's
source directory. If the manifest or the service worker is rejected,
a red **Errors** button appears on the resulting card per [cr-debug]
(see Parsing results).

### Step 4 - Pin the extension to the toolbar

Per [cr-hello]: *"Pin your extension to the toolbar to quickly access
your extension during development."* Open the puzzle-icon
**Extensions** menu, find the row, click the pin icon. The popup then
becomes a single-click target instead of a two-click one.

### Step 5 - Reload after edits

The reload requirements per [cr-hello]:

| Component edited | Reload action required |
|---|---|
| `manifest.json` | Click refresh on the extension card |
| Service worker (`background.service_worker`) | Click refresh on the extension card |
| Content scripts | Click refresh on the extension card **plus** refresh the host page |
| Popup HTML / JS | None, next open re-evaluates |
| Options page | None, next open re-evaluates |
| Other extension HTML pages | None |

The "click refresh on the card" gesture is what an automated harness
reproduces either by toggling
`chrome.management.setEnabled(id, false)` then
`setEnabled(id, true)` (which requires the `"management"` permission
per the [chrome.management reference][cr-mgmt]), or by closing and
re-launching the persistent browser context.

[cr-mgmt]: https://developer.chrome.com/docs/extensions/reference/api/management

### Worked example: confirming a fresh build loads

```text
1. npm run build                  -> produces dist/
2. chrome://extensions            -> Developer mode ON
3. Load unpacked                  -> select dist/  (the folder, not the file)
4. Expect: a card titled with manifest.name, an ID string,
   a "Service worker" link, and NO red "Errors" button.
5. Edit src/content.js, rebuild.
6. Click the card's refresh icon, then reload the host tab.
7. Re-check the card: still no Errors button.
```

Expected output shape of a healthy card:

```text
[icon]  Hello Extensions            1.0        [toggle ON]
        Base Level Extension
        ID: abcdefghijklmnopabcdefghijklmnop
        Inspect views: service worker
        [Details] [Remove] [Refresh]
```

A failed load replaces that with a red **Errors** button.

## Parsing results

### Manifest error cards

Per [cr-debug], when the extension fails to load or register, an
**Errors** button appears in red on the extension's card on
`chrome://extensions`. Clicking it lists the messages. Two exact
strings worth recognising, both quoted in [cr-debug]:

- `Required value version is missing or invalid. It must be between
  1-4 dot-separated integers each between 0 and 65536.` The `version`
  field is absent or malformed.
- `Service worker registration failed. Status code: 15.` The
  background service worker threw during registration. [cr-debug]
  notes the underlying error is listed underneath this line, so read
  the second line, not the status code.

### Service-worker logs

Per [cr-debug], click the blue **Inspect views** link next to the
extension to open DevTools scoped to the service worker. `console`
output, the network panel, and breakpoints all work there.

### Content-script logs

Per [cr-debug], content scripts run inside the web page, so their
errors surface in the **host page's** DevTools, not the extension's.
Use the context dropdown next to `top` in the console to switch from
the page's context to the extension's.

### Popup logs

Per [cr-debug], popup errors also appear behind the Errors button, and
the popup itself can be inspected by right-clicking it and choosing
inspect, which opens a DevTools window for that popup instance.

## CI integration

The manual `chrome://extensions` gesture is not automatable (see
Limitations). Two supported ways to perform the same load
unattended:

**1. Chrome launch flags on a persistent context.** Per the
[Playwright Chrome extensions guide][pw-ext]:

```js
const browserContext = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium',
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`
  ]
});
```

[pw-ext] states `channel: 'chromium'` is what "allows to run
extensions in headless mode", because Chrome and Edge removed the
command-line flags needed for side-loading.

[pw-ext]: https://playwright.dev/docs/chrome-extensions

**2. `web-ext` against a Chromium binary.** Per the
[web-ext command reference][web-ext], `--target chromium` runs the
extension in a Chromium-based browser, and `--chromium-binary` takes a
"Path or alias to a Chromium executable such as google-chrome,
google-chrome.exe, or opera.exe. If not specified, the default Google
Chrome is used."

```bash
web-ext run --target chromium --source-dir ./dist
```

[web-ext]: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

A minimal CI smoke job launches the context, waits for the extension's
service worker to appear, and exits non-zero if it never does. That
gates the slower behavioural jobs on "the build directory is loadable"
rather than letting a manifest typo present itself as fifty failing
tests.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Selecting `manifest.json` itself in Load unpacked | Chrome expects the extension's root *directory* per [cr-hello] | Select the parent folder of `manifest.json` |
| Editing a content script and expecting the next page load to pick it up | Content scripts need a card refresh **and** a host-page refresh per [cr-hello] | Refresh both |
| Reloading the card after a popup-only edit | Popup re-evaluates on next open per [cr-hello]; the reload is wasted time and resets service-worker state | Just reopen the popup |
| Assuming pinned-toolbar state survives a fresh profile | Pinning is per-profile UI state, set through the Extensions menu per [cr-hello] | Re-pin after every fresh-profile launch, or drive the popup through the puzzle menu |
| Loading via `channel: 'chrome'` in headless CI | Chrome and Edge removed the side-loading flags; only `channel: 'chromium'` runs extensions headless per [pw-ext] | Set `channel: 'chromium'` |
| Leaving service-worker DevTools open while testing idle behaviour | Per [cr-debug], an open DevTools window keeps the service worker active | Close DevTools before exercising termination |
| Treating `Service worker registration failed. Status code: 15.` as the root cause | It is a wrapper; the real error is printed under it per [cr-debug] | Read the following line |

## Limitations

- **The UI flow itself is not scriptable.** `chrome://` URLs are not
  linkable per [cr-hello], so page-context JavaScript cannot drive the
  Extensions page. Automation hooks in at browser launch instead, via
  the flags above.
- **Pinning is profile state.** A fresh user-data directory starts
  unpinned, so a test that clicks the toolbar icon must either pin
  first or go through the puzzle menu.
- **Programmatic reload costs a permission.** `management.setEnabled`
  requires the `"management"` permission per [cr-mgmt], which changes
  the extension under test. `management.getSelf` is the exception,
  usable without the permission per [cr-mgmt].
- **Loading proves nothing about behaviour.** A clean card means the
  manifest parsed and the service worker registered. It does not mean
  content scripts matched, permissions were granted, or any runtime
  API works.
- **Cross-browser gestures differ.** This is the Chromium developer
  flow; Firefox uses its own temporary-add-on flow, and `web-ext`
  targets it separately per [web-ext].

## References

- Chrome Extensions, Hello World tutorial (minimum manifest, root
  directory rule, `chrome://extensions` routes, Developer mode, Load
  unpacked, pinning, reload matrix):
  https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
- Chrome Extensions, Debug your extension (Errors button, exact error
  strings, Inspect views, content-script and popup log locations):
  https://developer.chrome.com/docs/extensions/get-started/tutorial/debug
- `chrome.management` API reference (`setEnabled`, permission,
  `getSelf` exception):
  https://developer.chrome.com/docs/extensions/reference/api/management
- Playwright, Chrome extensions (`launchPersistentContext`,
  `--disable-extensions-except`, `--load-extension`,
  `channel: 'chromium'`): https://playwright.dev/docs/chrome-extensions
- `web-ext` command reference (`--target chromium`,
  `--chromium-binary`, `--source-dir`):
  https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
