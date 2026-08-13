# Extension reload matrix - what a code edit re-evaluates

Companion reference for `playwright-extension-fixtures`. Consult when an edit
appears to have no effect and you need to know which extension surface
requires an explicit reload - the manual `chrome://extensions` card-refresh
gesture this fixture automates.

Per the [Chrome Extensions "Hello World" tutorial][cr-hello]:

| Component edited | Reload action required |
|---|---|
| `manifest.json` | Click refresh on the extension card |
| Service worker (`background.service_worker`) | Click refresh on the extension card |
| Content scripts | Click refresh on the extension card **plus** refresh the host page |
| Popup HTML / JS | None, next open re-evaluates |
| Options page | None, next open re-evaluates |
| Other extension HTML pages | None |

[cr-hello]: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

An automated harness reproduces the "click refresh on the card" gesture
either by toggling `chrome.management.setEnabled(id, false)` then
`setEnabled(id, true)` (requires the `"management"` permission per the
[chrome.management reference][cr-mgmt]; `management.getSelf` is the
no-permission exception), or by closing and re-launching the persistent
browser context.

[cr-mgmt]: https://developer.chrome.com/docs/extensions/reference/api/management

Anti-patterns the matrix prevents:

- Editing a content script and expecting the next page load to pick it up -
  content scripts need the card refresh **and** a host-page refresh per
  [cr-hello].
- Reloading the card after a popup-only edit - the popup re-evaluates on
  next open per [cr-hello]; the reload is wasted time and resets
  service-worker state.
