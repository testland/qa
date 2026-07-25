# Cross-boundary messaging: web pages, other extensions, and native hosts

Deep reference for `chrome-extension-messaging-tests` SKILL.md. Consult when a
companion web site or another extension must talk to the extension under test,
or when a native helper application is part of the product.

## Web-page and cross-extension messages

Per the [Chrome Extensions message passing page][cr-msg], a web page can send to
an extension only if the extension declares the page's origin in
`externally_connectable`:

[cr-msg]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

```json
"externally_connectable": {
  "matches": ["https://*.example.com/*"]
}
```

```js
// On the allow-listed web page
chrome.runtime.sendMessage(editorExtensionId, { openUrlInEditor: url },
  response => { if (!response.success) handleError(url); });
```

```js
// In the extension
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (sender.id !== allowlistedExtension) return;
  if (request.getTargetData) sendResponse({ targetData });
});
```

The [externally_connectable reference][cr-extconn] defines the defaults that
produce the two most common surprises, both worth a regression test:

[cr-extconn]: https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable

- Without the key declared, *"all extensions can connect, but no web pages can
  connect."*
- Adding the key **without** `"ids": ["*"]` means other extensions lose the
  ability to connect, per [cr-extconn]. A manifest change that adds a `matches`
  list for a web page silently breaks a previously working
  extension-to-extension flow unless `ids` is set too.

Per the [chrome.runtime reference][cr-runtime],
`chrome.runtime.onMessageExternal` fires *"when a message is sent from another
extension (by runtime.sendMessage)"* and cannot be used in content scripts, so
the listener belongs in the service worker or an extension page.

[cr-runtime]: https://developer.chrome.com/docs/extensions/reference/api/runtime

Direction matters. Per [cr-msg]: *"It is not possible to send a message from an
extension to a web page."* A test expecting the reverse direction is testing the
wrong mechanism and should be rewritten against custom DOM events or
content-script injection.

Test targets:

- An origin inside `matches` gets a response.
- An origin outside `matches` gets no response at all (not an error response).
- A sender extension ID not on the allow-list is rejected by the `sender.id`
  guard.
- After adding a `matches` list, a previously working cross-extension send still
  works (the `ids` regression above).

## Native messaging

Per [cr-msg], native messaging works like cross-extension messaging with one
substitution: *"runtime.connectNative() is used instead of runtime.connect()"*.
The [native messaging guide][cr-native] adds that the `nativeMessaging`
permission must be declared and that these methods are unavailable in content
scripts, and [cr-runtime] gives the signature as
`chrome.runtime.connectNative(application)` returning a `Port`.

[cr-native]: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

The host must be registered on the machine before any test can pass. Per
[cr-native], the host manifest lives at:

| OS | Location |
|---|---|
| Windows | Registry key `HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\[host-name]` or the `HKEY_CURRENT_USER` equivalent |
| macOS | `/Library/Google/Chrome/NativeMessagingHosts/` system-wide, `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` per user |
| Linux | `/etc/opt/chrome/native-messaging-hosts/` system-wide, `~/.config/google-chrome/NativeMessagingHosts/` per user |

Per [cr-native], the manifest's `allowed_origins` is the *"List of extensions
that should have access to the native messaging host"*, and those values
*"can't contain wildcards"* - so the extension ID under test must be listed
literally, which means a fresh unpacked-load ID will not match a manifest
written for the published ID.

Native messaging has its own size limits, tighter than the general ones. Per
[cr-native]: *"The maximum size of a single message from the native messaging
host is 1 MB"* while *"The maximum size of the message sent to the native
messaging host is 64 MiB."* Assert the inbound 1 MB ceiling explicitly if the
host returns bulk data.

## Sources

- Chrome Extensions, Message passing (`externally_connectable` examples,
  extension-to-page direction, `connectNative` substitution):
  https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- `externally_connectable` manifest key (defaults, `ids`, `matches`):
  https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable
- `chrome.runtime` API reference (`onMessageExternal`, `connectNative`):
  https://developer.chrome.com/docs/extensions/reference/api/runtime
- Chrome Extensions, Native messaging (host manifest locations,
  `allowed_origins`, 1 MB inbound / 64 MiB outbound limits):
  https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
