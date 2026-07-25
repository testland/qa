---
name: chrome-extension-messaging-tests
description: "Asserts Chrome extension message-passing behaviour against a running extension: one-shot `chrome.runtime.sendMessage` plus the literal `return true` that holds the response channel open for an async `sendResponse`, `chrome.tabs.sendMessage` into one tab's content script, long-lived `chrome.runtime.connect` ports and their `onDisconnect` triggers, web-page messages gated by `externally_connectable`, and `chrome.runtime.connectNative` native-messaging hosts. Covers the payload rules a test must respect (Chrome uses JSON serialization rather than structured clone, so `Map` / `Set` / `Date` do not round-trip; maximum message size is 64 MiB) and the first-listener-wins rule when several `onMessage` listeners are registered. Scope is messaging behaviour on an already-running extension, not the install or reload step. Use when a message reaches no listener, a `sendResponse` callback never fires, a port disconnects mid-test, or a page origin has to be proven allowed before publishing."
metadata:
  keywords: "chrome-runtime-sendmessage, chrome-runtime-connect, externally-connectable, native-messaging, onmessage-listener"
---

# chrome-extension-messaging-tests

## Overview

Extension components run in separate contexts (content script,
service worker, popup, options page, an external web page, a native
host process) and can only reach each other through the messaging
APIs described on the
[Chrome Extensions message passing page][cr-msg]. That page defines
five distinct shapes, each with its own failure mode:

[cr-msg]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

1. One-shot **runtime** messages inside one extension
   (`chrome.runtime.sendMessage`).
2. One-shot **tabs** messages into a content script
   (`chrome.tabs.sendMessage`).
3. Long-lived **ports** (`chrome.runtime.connect`).
4. **Cross-extension** and **web-page** messages, gated by
   `externally_connectable`.
5. **Native messaging** (`chrome.runtime.connectNative`).

Most "the feature silently does nothing" bugs in an extension are one
of these five failing quietly: a channel closed before the response, a
message sent to a tab with no matching content script, a port dropped
by a suspended service worker, or an origin missing from an
allow-list. Tests here make each of those loud.

## Scope boundary

This skill owns **assertions about messages** once an extension is
installed and running: who can send, who receives, what the response
contract is, when a channel closes, and what a payload is allowed to
contain.

It deliberately does **not** cover getting the extension installed,
reloaded, or refreshed after a code edit. Those are a separate job with
a separate symptom: an install problem shows up as an extension that is
absent or shows an error before any test runs, while everything here
shows up as a running extension whose messages go nowhere. Assume the
extension under test is loaded and its ID is known before applying
anything below.

## When to use

- `sendMessage` resolves `undefined` or the callback never fires, and
  you need a test that pins down which side dropped the channel.
- A popup action does nothing on the page: the message may never be
  reaching the content script.
- A long-lived connection dies partway through a session and you need
  to distinguish a deliberate `disconnect()` from an unloaded frame.
- A companion web site must talk to the extension and the
  `externally_connectable` allow-list has to be proven correct before
  publishing.
- A native helper application is part of the product and CI has to
  prove the host is reachable.

## How to use

1. **Identify the shape.** Map the failing (or new) path to one of the
   five messaging shapes in the Overview - one-shot runtime, one-shot
   tabs, long-lived port, external / web-page, or native.
2. **Confirm the extension is running.** Install / reload is out of
   scope (see Scope boundary); assume the extension is loaded and its ID
   is known before writing an assertion.
3. **Write the sender / listener pair** for that shape. The two one-shot
   forms are in Authoring below; ports and the cross-boundary surfaces
   are in the linked references.
4. **Assert the full response object** with an equality matcher, never
   `toBeDefined()` - the failure this API produces most often is an
   `undefined`-shaped response that `toBeDefined()` passes on.
5. **Apply the payload guardrails.** Build fixtures from
   JSON-representable values only, and route on a message-type field so
   exactly one `onMessage` listener owns each type.
6. **Re-check the draft** against the Anti-patterns table before
   committing.

## Authoring

### 1. One-shot runtime messages

Per [cr-msg], the sender awaits a promise and the listener responds:

```js
// Sender (content script, popup, or options page)
const response = await chrome.runtime.sendMessage({ greeting: 'hello' });

// Listener (service worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.greeting !== 'hello') return;
  fetch('https://example.com')
    .then(r => sendResponse({ statusCode: r.status }));
  return true;  // hold the channel open for the async sendResponse
});
```

The `return true` is load-bearing. Per [cr-msg], to respond
asynchronously using `sendResponse()` you must return *"a literal
`true` (not just a truthy value)"*. Returning a truthy non-literal, or
returning nothing, closes the channel and the sender's promise settles
without the response.

From Chrome 148 a listener may instead return a promise whose resolved
value becomes the response, per [cr-msg]. The same page notes promise
support *"is not enabled in extension script contexts if the extension
extends DevTools with a devtools page"*, so a DevTools-extending
extension must keep using the `return true` form.

**The async-listener trap.** An `async` listener implicitly returns a
promise, which is not the literal `true` that [cr-msg] requires. On a
Chrome older than 148, or in a DevTools-extending extension, that
promise is ignored and the channel closes. Author either a
non-`async` listener with `return true`, or an `async` listener that
returns the response value.

Test to write:

```js
test('status request resolves with the fetched status code', async () => {
  const response = await sendFromContentScript({ greeting: 'hello' });
  expect(response).toEqual({ statusCode: 200 });   // not toBeDefined()
});
```

Assert the full response object. A `toBeDefined()` assertion passes on
the `undefined`-shaped failure this API produces most often.

### 2. One-shot tabs messages

Per [cr-msg], drive a specific tab's content script from the popup or
service worker:

```js
chrome.tabs.sendMessage(tab.id, { greeting: 'hello' }, response => {
  const resp = JSON.parse(response.farewell);
});
```

The [chrome.tabs reference][cr-tabs] gives the signature as
`chrome.tabs.sendMessage(tabId, message, options?)` returning a
promise, with `options.frameId` to target one frame instead of all
frames and `options.documentId` (Chrome 106 and later) to target one
document. Per [cr-tabs], *"If an error occurs while connecting to the
specified tab, the promise will be rejected"* - which is the assertion
to write for the no-content-script-injected case.

[cr-tabs]: https://developer.chrome.com/docs/extensions/reference/api/tabs

Test targets:

- Happy path: a tab with the content script injected resolves the
  expected response body.
- Rejection path: a tab whose URL does not match any
  `content_scripts` pattern rejects the promise. Assert the rejection,
  not a timeout.
- Frame targeting: with an iframe present, `frameId` limits delivery
  to that frame per [cr-tabs].

## Long-lived ports, external, and native surfaces

The three remaining shapes carry more incidental depth - port lifecycle
tied to the service worker, the `externally_connectable` allow-list, and
machine-level native-host registration - so their code recipes live in
two companion references:

- **Long-lived ports + service-worker lifecycle** - `connect` /
  `onConnect`, the `onDisconnect` conditions, the wrong-port-name
  disconnect test, and the 30-second idle-termination interaction:
  [references/long-lived-ports.md](references/long-lived-ports.md).
- **Cross-boundary messages (web-page, cross-extension, native)** -
  `externally_connectable` defaults, `onMessageExternal`,
  `connectNative`, and the per-OS native-host manifest table:
  [references/cross-boundary-messaging.md](references/cross-boundary-messaging.md).

## Payload constraints every test must respect

Per [cr-msg], the maximum size of a message is **64 MiB**, and Chrome
uses JSON serialization, *"different to other browsers which implement
the same APIs with the structured clone algorithm."*

That single sentence invalidates a class of test fixtures. Under JSON
serialization:

| Value sent | What the receiver gets |
|---|---|
| `Map` / `Set` | `{}` (own enumerable properties only) |
| `Date` | an ISO string, not a `Date` |
| `undefined` property | key dropped from the object |
| `NaN` / `Infinity` | `null` |
| typed array / `ArrayBuffer` | an index-keyed object or `{}` |
| circular reference | serialization throws |

Build fixtures out of plain JSON-representable objects, and assert on
the serialized shape the receiver actually observes rather than on
identity with the object you sent. A cross-browser suite should note
that the same fixture behaves differently elsewhere, since [cr-msg]
attributes structured clone to other browsers implementing these APIs.

Per [cr-msg], when several `onMessage` listeners are registered,
*"Only the first listener to respond, reject, or throw an error will
affect the sender; all other listeners will run, but their results
will be ignored."* Any test asserting a specific response in a
codebase with more than one listener is implicitly asserting listener
order, which is fragile. Prefer routing on a message-type field so
exactly one listener can respond to a given message.

Errors surface in two shapes per [cr-runtime]: callback-style calls
set `chrome.runtime.lastError`, described as *"Populated with an error
message if calling an API function fails; otherwise undefined"*, while
*"API functions that return promises do not set this property"* and
reject instead. A test must check the mechanism matching the call
style it used, or a real failure reads as a pass.

## Worked example: a full messaging regression suite

```text
runtime one-shot
  [x] resolves the full response object for a known message type
  [x] async listener without `return true` is caught (response is undefined)
  [x] unknown message type produces no response

tabs
  [x] matching tab resolves the response body
  [x] non-matching tab rejects the promise
  [x] frameId targets one frame only

ports
  [x] named port receives the expected reply sequence
  [x] wrong port name yields exactly one onDisconnect and no reply
  [x] explicit disconnect() records exactly one onDisconnect
  [x] traffic every <30s keeps the port alive across the idle window

external
  [x] allow-listed origin gets a response
  [x] non-allow-listed origin gets none
  [x] non-allow-listed sender extension id is ignored
  [x] adding `matches` did not break extension-to-extension sends

payload
  [x] Date round-trips as an ISO string, not a Date
  [x] Map serializes to {}
  [x] a message over 64 MiB fails rather than silently truncating
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Async `onMessage` listener returning nothing | Not the literal `true` [cr-msg] requires, so the channel closes and the sender sees no response | Return the response value, or use a non-async listener with `return true` |
| Returning a truthy non-`true` value to keep the channel open | [cr-msg] requires *"a literal `true` (not just a truthy value)"* | `return true` |
| Sending `Map` / `Set` / `Date` and asserting on the type | JSON serialization, not structured clone, per [cr-msg] | Send plain objects; assert on the serialized shape |
| `expect(response).toBeDefined()` | Passes on the `undefined` result the closed-channel bug produces | Assert the full object with an equality matcher |
| Asserting a response with several `onMessage` listeners registered | Only the first to respond affects the sender per [cr-msg] | Route on a message-type field so one listener owns each type |
| Idling a port test past the service-worker idle window | Termination after 30 seconds of inactivity per [cr-sw]; opening a port does not reset the timer | Exchange a message inside the window, or assert the termination deliberately |
| Adding `externally_connectable.matches` without `ids` | Other extensions lose the ability to connect per [cr-extconn] | Set `ids` alongside `matches` and keep a cross-extension regression test |
| Expecting the extension to push a message to a web page | *"It is not possible to send a message from an extension to a web page"* per [cr-msg] | Use custom DOM events or content-script injection |
| Checking `chrome.runtime.lastError` after a promise-based call | Promise-returning functions do not set it per [cr-runtime] | Assert on the rejection instead |
| Reusing a published extension ID in a native-messaging `allowed_origins` while testing an unpacked build | `allowed_origins` values cannot contain wildcards per [cr-native], and an unpacked load has a different ID | List the unpacked build's actual ID in `allowed_origins` |

## Limitations

- **Cross-extension tests need both extensions present.** A
  `chrome.runtime.sendMessage(otherExtensionId, ...)` test is
  meaningless unless the recipient extension is also installed in the
  same profile.
- **Native messaging needs a machine-level install.** The host
  manifest must exist at the per-OS path listed in
  [references/cross-boundary-messaging.md](references/cross-boundary-messaging.md)
  per [cr-native], so CI images need an explicit setup step; this
  cannot be arranged from inside the extension.
- **Service-worker lifetime bounds long-running assertions.** Per
  [cr-sw] the worker terminates after 30 seconds of inactivity, so
  "wait a minute then assert" is not a valid test shape.
- **`externally_connectable` is a Chromium manifest key.** A
  cross-browser suite has to branch: the key is declared in the
  Chromium manifest documentation at [cr-extconn], and a browser that
  does not implement it will not gate connections the same way.
- **Behaviour differs by serialization model across browsers.** Per
  [cr-msg] Chrome uses JSON serialization while other browsers
  implementing the same APIs use structured clone, so payload
  assertions are not portable without branching.

## References

- Chrome Extensions, Message passing (all five messaging shapes,
  `return true`, `onDisconnect` conditions, `externally_connectable`
  examples, 64 MiB cap, JSON serialization, first-listener-wins,
  extension-to-page direction):
  https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- `chrome.runtime` API reference (`connect` / `connectInfo.name`,
  `onMessageExternal`, `connectNative`, `lastError` versus promise
  rejection):
  https://developer.chrome.com/docs/extensions/reference/api/runtime
- `chrome.tabs` API reference (`sendMessage` signature, `frameId`,
  `documentId`, rejection on connect failure):
  https://developer.chrome.com/docs/extensions/reference/api/tabs
- `externally_connectable` manifest key (defaults, `ids`, `matches`):
  https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable
- Chrome Extensions, Native messaging (host manifest locations,
  `allowed_origins`, 1 MB inbound / 64 MiB outbound limits):
  https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Extension service worker lifecycle (30-second idle termination,
  long-lived messaging keeping the worker alive):
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Deep reference - long-lived ports + service-worker lifecycle:
  [references/long-lived-ports.md](references/long-lived-ports.md).
- Deep reference - cross-boundary messaging (web-page, cross-extension,
  native): [references/cross-boundary-messaging.md](references/cross-boundary-messaging.md).

[cr-runtime]: https://developer.chrome.com/docs/extensions/reference/api/runtime
[cr-sw]: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
[cr-extconn]: https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable
[cr-native]: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
