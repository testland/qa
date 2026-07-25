# Long-lived ports and service-worker lifecycle

Deep reference for `chrome-extension-messaging-tests` SKILL.md. Consult when a
long-lived `chrome.runtime.connect` port drops mid-session or a port test has to
account for service-worker suspension.

Per the [Chrome Extensions message passing page][cr-msg], a port is opened with
`chrome.runtime.connect` and answered by `onConnect`:

[cr-msg]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

```js
// Content script
const port = chrome.runtime.connect({ name: 'knockknock' });
port.onMessage.addListener(msg => {
  if (msg.question === "Who's there?") port.postMessage({ answer: 'Madame' });
});
port.postMessage({ joke: 'Knock knock' });

// Service worker
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'knockknock') return;
  port.onMessage.addListener(msg => {
    if (msg.joke === 'Knock knock') port.postMessage({ question: "Who's there?" });
  });
});
```

The [chrome.runtime reference][cr-runtime] gives
`chrome.runtime.connect(extensionId?, connectInfo?)` returning a `Port`, where
`connectInfo.name` *"will be passed into onConnect for processes that are
listening for the connection event"*. That name is what the
`port.name !== 'knockknock'` guard above filters on, so a test that connects
with the wrong name should observe no reply.

[cr-runtime]: https://developer.chrome.com/docs/extensions/reference/api/runtime

Per [cr-msg], `onDisconnect` fires when: no listeners exist for `onConnect`, the
tab unloads, the originating frame unloads, all receiving frames unload, or
`disconnect()` is called. A port test should cover at least the first and last
of those, because they are the two a bug produces:

```js
test('connecting with an unknown port name disconnects immediately', async () => {
  const events = [];
  const port = chrome.runtime.connect({ name: 'no-such-listener' });
  port.onDisconnect.addListener(() => events.push('disconnect'));
  await settle();
  expect(events).toEqual(['disconnect']);
});
```

Accumulate disconnect events into an array rather than setting a boolean. A port
can have multiple receiving frames per [cr-msg], so "exactly one disconnect" is
an assertion you should make explicitly rather than assume.

## Service-worker suspension interacts with ports

Per the [extension service worker lifecycle page][cr-sw], the service worker
terminates after 30 seconds of inactivity, and *"Opening a port no longer resets
the timers"* as of Chrome 114. What keeps it alive is traffic: [cr-sw] states
*"Sending a message with long-lived messaging keeps the service worker alive"*.
A port test that idles longer than 30 seconds without exchanging a message is
asserting against a terminated worker, and the disconnect it observes is the
platform, not a bug.

[cr-sw]: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

## Sources

- Chrome Extensions, Message passing (`onDisconnect` conditions, multiple
  receiving frames):
  https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- `chrome.runtime` API reference (`connect` / `connectInfo.name`):
  https://developer.chrome.com/docs/extensions/reference/api/runtime
- Extension service worker lifecycle (30-second idle termination, long-lived
  messaging keeping the worker alive):
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
