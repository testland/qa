---
name: in-app-notification-test-author
description: "Build-an-X workflow for testing real-time in-app notifications delivered over WebSocket (RFC 6455) or Server-Sent Events (WHATWG SSE spec), Firebase Realtime Database / Firestore listeners, and notification center read/unread state - covers fan-out to multiple sessions, offline-then-reconnect delivery, and ordering guarantees. Distinct from email, SMS, push, and webhook channels. Use when authoring tests for any notification that appears inside a connected web or mobile app UI without leaving the application."
rating: 23
d6: 4
---

# in-app-notification-test-author

## Overview

In-app notifications are the channel that email, SMS, push, and webhook tests
do not cover: real-time messages delivered to a connected client *inside* the
application, typically via a persistent transport. Four transport stacks are
common:

| Transport | Standard / provider | Primary use |
|---|---|---|
| **WebSocket** | IETF RFC 6455 | Bidirectional; chat, live feeds, collaboration |
| **SSE** | WHATWG HTML Living Standard (EventSource) | Server-to-client only; activity feeds, progress |
| **Firebase RTDB listeners** | Firebase Realtime Database | JSON tree synced to all clients |
| **Firestore onSnapshot** | Cloud Firestore | Document / collection live listeners |

The skill walks a common test workflow and then provides per-transport patterns.
Transport-level protocol tests (frame parsing, flow control, SSE reconnect
timing) belong to `qa-realtime-protocols`; this skill tests the *notification
feature layer* that runs on top.

## When to use

- The product has a notification center, activity feed, or live-update panel
  inside the app UI.
- Tests need to verify that a server-side event (new message, payment received,
  status change) reaches the connected client and updates UI state.
- A regression suite must cover unread/read state transitions and fan-out to
  multiple concurrent sessions.
- Tests must cover offline queuing and in-order delivery after reconnect.

## Step 1 - Choose the isolation level

| Level | Example | Trade-offs |
|---|---|---|
| Mock the transport | Simulate WebSocket messages via a test double | Fast, deterministic; misses server fan-out logic |
| Local server | `ws` / `socket.io` test server in the same process | Covers serialization and handler logic |
| Firebase emulator | Firebase Local Emulator Suite | Covers RTDB / Firestore rules + listener behavior |
| Full integration | Real backend + test user tokens | Highest fidelity; slowest |

Default: mock the transport for unit tests of the notification handler; use the
Firebase emulator for RTDB / Firestore delivery tests; reserve full integration
for fan-out and ordering scenarios.

## Step 2 - WebSocket delivery tests

Per [RFC 6455 Section 4](https://www.rfc-editor.org/rfc/rfc6455#section-4),
the opening handshake upgrades HTTP to a persistent bidirectional channel
(`101 Switching Protocols`). The server sends a notification as a text or
binary frame (opcodes `0x1` / `0x2` per RFC 6455 Section 5.2). Tests mock at
the frame-receive boundary so the notification handler is exercised without a
live server.

**Test pattern (Node.js / Jest with `ws`):**

```javascript
const WebSocket = require('ws');
const { jest } = require('@jest/globals');

describe('in-app notification handler - WebSocket', () => {
  let server;
  let wss;

  beforeEach((done) => {
    wss = new WebSocket.Server({ port: 0 }, done);
  });

  afterEach((done) => {
    wss.close(done);
  });

  it('delivers notification payload to the client handler', (done) => {
    wss.once('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'NEW_MESSAGE', id: 'n-1', body: 'Hello' }));
    });

    const client = new WebSocket(`ws://localhost:${wss.options.port}`);
    client.on('message', (data) => {
      const msg = JSON.parse(data);
      expect(msg.type).toBe('NEW_MESSAGE');
      expect(msg.id).toBe('n-1');
      client.close();
      done();
    });
  });

  it('marks notification unread on receipt', (done) => {
    wss.once('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'NEW_MESSAGE', id: 'n-2', body: 'Hi' }));
    });

    const client = new WebSocket(`ws://localhost:${wss.options.port}`);
    const notificationStore = createNotificationStore(); // app module under test

    client.on('message', (data) => {
      notificationStore.receive(JSON.parse(data));
      expect(notificationStore.unreadCount()).toBe(1);
      client.close();
      done();
    });
  });
});
```

Per [RFC 6455 Section 7.4.1](https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1),
the close code `1000` signals normal closure; `1001` means the endpoint is
going away. Tests for reconnect logic should simulate `1001` or `1006`
(abnormal closure) and assert that the client attempts reconnection and
re-subscribes to notification channels.

## Step 3 - SSE delivery tests

The [WHATWG HTML Living Standard (Server-Sent Events)](https://html.spec.whatwg.org/multipage/server-sent-events.html)
defines the `EventSource` interface. A connection is established at state `0`
(CONNECTING), transitions to `1` (OPEN) when the server responds with
`Content-Type: text/event-stream`, and events are dispatched as
`MessageEvent` objects with `data`, `origin`, and `lastEventId` properties.

Per the spec, when a connection closes the user agent automatically
reconnects and sends the `Last-Event-ID` header so the server can resume
delivery from the last acknowledged event. Tests should assert this recovery
path.

**Test pattern (Node.js with `eventsource` + `express`):**

```javascript
const EventSource = require('eventsource');
const express = require('express');

describe('in-app notification handler - SSE', () => {
  let app;
  let httpServer;
  let sentEvents = [];

  beforeAll((done) => {
    app = express();
    app.get('/notifications/stream', (req, res) => {
      res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      sentEvents.forEach(({ id, data }) => {
        res.write(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
      });
    });
    httpServer = app.listen(0, done);
  });

  afterAll((done) => httpServer.close(done));

  it('dispatches notification event to the handler', (done) => {
    sentEvents = [{ id: 'e-1', data: { type: 'PAYMENT_RECEIVED', amount: 50 } }];
    const port = httpServer.address().port;
    const es = new EventSource(`http://localhost:${port}/notifications/stream`);

    es.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      expect(payload.type).toBe('PAYMENT_RECEIVED');
      expect(event.lastEventId).toBe('e-1');
      es.close();
      done();
    };
  });
});
```

The `retry` field (milliseconds) in an SSE event controls reconnection delay
per the WHATWG spec. Test that the client honors a server-supplied `retry`
value by asserting reconnect timing in integration tests.

## Step 4 - Firebase Realtime Database listener tests

Firebase RTDB uses a persistent WebSocket internally. The
[Firebase RTDB read/write docs](https://firebase.google.com/docs/database/web/read-and-write)
describe `onValue()` as the primary listener: it fires once immediately with
current data and again on every subsequent change at that location and below.

Use the [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
to run RTDB listener tests without hitting production.

**Test pattern (Jest + Firebase JS SDK v9 modular + emulator):**

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off } from 'firebase/database';
import { connectDatabaseEmulator } from 'firebase/database';

const app = initializeApp({ projectId: 'test-project', databaseURL: 'http://127.0.0.1:9000?ns=test' });
const db = getDatabase(app);
connectDatabaseEmulator(db, '127.0.0.1', 9000);

describe('in-app notification - RTDB listener', () => {
  const notifRef = ref(db, 'users/u-1/notifications/n-1');

  afterEach(() => off(notifRef));

  it('delivers notification to listener when record is written', (done) => {
    onValue(notifRef, (snapshot) => {
      if (!snapshot.exists()) return;
      expect(snapshot.val().type).toBe('ORDER_SHIPPED');
      done();
    });

    set(notifRef, { type: 'ORDER_SHIPPED', read: false, ts: Date.now() });
  });

  it('reflects read-state update when notification is marked read', (done) => {
    const updates = [];
    onValue(notifRef, (snapshot) => {
      if (!snapshot.exists()) return;
      updates.push(snapshot.val().read);
      if (updates.length === 2) {
        expect(updates[0]).toBe(false);
        expect(updates[1]).toBe(true);
        done();
      }
    });

    set(notifRef, { type: 'ORDER_SHIPPED', read: false, ts: Date.now() }).then(() =>
      set(notifRef, { type: 'ORDER_SHIPPED', read: true, ts: Date.now() })
    );
  });
});
```

The Firebase RTDB SDK queues writes locally when offline and delivers them
after reconnect per the
[Firebase offline capabilities docs](https://firebase.google.com/docs/database/web/offline-capabilities).
The connection state is exposed at `/.info/connected` (a boolean updated on
every connection state change; individual client state only, not global).

## Step 5 - Firestore onSnapshot tests

Per the [Firebase Firestore listen docs](https://firebase.google.com/docs/firestore/query-data/listen),
`onSnapshot()` fires immediately with the current document and again on each
change. The snapshot carries `metadata.hasPendingWrites` (true when local
changes have not yet been confirmed by the backend, per the Firestore docs)
and `metadata.fromCache` (true when data was served from the local cache).
Tests that verify offline-then-reconnect delivery should assert `fromCache`
transitions.

```javascript
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { connectFirestoreEmulator } from 'firebase/firestore';

const firestoreDb = getFirestore(app);
connectFirestoreEmulator(firestoreDb, '127.0.0.1', 8080);

it('delivers live notification and clears pending-writes flag', (done) => {
  const notifDoc = doc(firestoreDb, 'notifications', 'n-99');
  const states = [];
  const unsub = onSnapshot(notifDoc, { includeMetadataChanges: true }, (snap) => {
    if (!snap.exists()) return;
    states.push({ pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache });
    // wait for the server-confirmed write (hasPendingWrites false + fromCache false)
    if (states.length >= 2 && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) {
      expect(states[0].pending).toBe(true);   // local write, not yet confirmed
      expect(states[states.length - 1].pending).toBe(false); // server confirmed
      unsub();
      done();
    }
  });

  setDoc(notifDoc, { type: 'INVOICE_READY', read: false });
});
```

## Step 6 - Notification center read/unread state

In-app notification centers track aggregate unread counts and per-notification
read state. Test the state machine independently of the transport:

```javascript
describe('notification store', () => {
  it('increments unread count when a new notification arrives', () => {
    const store = createNotificationStore();
    store.receive({ id: 'n-1', type: 'COMMENT', read: false });
    expect(store.unreadCount()).toBe(1);
  });

  it('decrements unread count when notification is marked read', () => {
    const store = createNotificationStore();
    store.receive({ id: 'n-1', type: 'COMMENT', read: false });
    store.markRead('n-1');
    expect(store.unreadCount()).toBe(0);
  });

  it('markAllRead resets unread count to zero', () => {
    const store = createNotificationStore();
    ['n-1', 'n-2', 'n-3'].forEach((id) =>
      store.receive({ id, type: 'COMMENT', read: false })
    );
    store.markAllRead();
    expect(store.unreadCount()).toBe(0);
  });
});
```

## Step 7 - Fan-out to multiple sessions

Fan-out (one server event reaching N simultaneously connected clients) is a
distinct failure mode from single-client delivery. Test with multiple
concurrent WebSocket or SSE clients:

```javascript
it('delivers the same notification to all connected sessions', (done) => {
  const PORT = wss.options.port;
  const received = [];
  const SESSIONS = 3;

  const clients = Array.from({ length: SESSIONS }, () => new WebSocket(`ws://localhost:${PORT}`));

  clients.forEach((ws) => {
    ws.on('message', (data) => {
      received.push(JSON.parse(data));
      if (received.length === SESSIONS) {
        const ids = received.map((m) => m.id);
        expect(new Set(ids).size).toBe(1);         // same notification id
        expect(ids.length).toBe(SESSIONS);         // all sessions received it
        clients.forEach((c) => c.close());
        done();
      }
    });
  });

  // wait for all clients to connect, then broadcast
  let connected = 0;
  wss.on('connection', () => {
    connected += 1;
    if (connected === SESSIONS) broadcastNotification({ id: 'n-fan', type: 'ALERT' });
  });
});
```

## Step 8 - Offline-then-reconnect delivery

Tests for RTDB and Firestore leverage the emulator's network simulation; for
WebSocket/SSE, simulate by closing the connection before events are sent:

```javascript
it('delivers queued notifications after reconnect', (done) => {
  let reconnected = false;
  let client = new WebSocket(`ws://localhost:${PORT}`);

  client.once('open', () => {
    // simulate disconnect by closing the connection abruptly
    client.terminate();

    // reconnect after a short delay
    client = new WebSocket(`ws://localhost:${PORT}`);
    reconnected = true;
    client.on('message', (data) => {
      expect(reconnected).toBe(true);
      const msg = JSON.parse(data);
      expect(msg.type).toBe('QUEUED_NOTIFICATION');
      client.close();
      done();
    });
  });
});
```

For RTDB, the SDK's automatic reconnect behavior and local queue persistence
are documented in the [Firebase offline capabilities docs](https://firebase.google.com/docs/database/web/offline-capabilities).
`/.info/connected` transitions from `false` to `true` on reconnect; assert
this in integration tests to confirm the client re-established its listener
subscriptions before asserting notification delivery.

## Step 9 - Ordering assertions

In-app notification streams must deliver events in consistent order, especially
when multiple events are emitted in quick succession. Per the
[WHATWG SSE spec](https://html.spec.whatwg.org/multipage/server-sent-events.html),
`MessageEvent.lastEventId` tracks the sequence position and is replayed as the
`Last-Event-ID` header on reconnect, enabling gap detection:

```javascript
it('delivers notifications in emission order', (done) => {
  const received = [];
  wss.once('connection', (ws) => {
    ['n-1', 'n-2', 'n-3'].forEach((id) =>
      ws.send(JSON.stringify({ id, type: 'ACTIVITY', seq: parseInt(id.split('-')[1]) }))
    );
  });

  const client = new WebSocket(`ws://localhost:${PORT}`);
  client.on('message', (data) => {
    received.push(JSON.parse(data));
    if (received.length === 3) {
      const seqs = received.map((m) => m.seq);
      expect(seqs).toEqual([1, 2, 3]);
      client.close();
      done();
    }
  });
});
```

## Step 10 - Test recipe checklist

For each in-app notification transport in the codebase:

1. Happy-path single-client delivery (Steps 2-5)
2. Notification store unread/read state transitions (Step 6)
3. Fan-out: N sessions receive the same event (Step 7)
4. Offline-then-reconnect: queued events arrive in order after reconnect (Step 8)
5. Ordering: rapid successive emissions arrive in sequence (Step 9)
6. Close-code / error-code handling: `1001` / `1006` for WebSocket (Step 2); HTTP 204 disabling SSE reconnection (Step 3)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only single-session delivery | Fan-out bugs (missed broadcasts, duplicates) go undetected | Step 7 multi-client test |
| Assert notification text in transport test | Couples UI copy to protocol test; brittle on copy changes | Assert `type` + `id` fields; test UI text separately |
| Fire-and-forget RTDB write without awaiting listener | Race between write and listener callback | Use `onValue` callback as the assertion gate (Steps 4-5) |
| Skip `fromCache` / `hasPendingWrites` assertions | Offline delivery bugs appear only in production | Firestore `includeMetadataChanges: true` (Step 5) |
| Mock at the application store instead of the transport boundary | Transport serialization bugs (JSON parse errors, binary frame issues) go untested | Mock at the WebSocket/SSE message event boundary (Steps 2-3) |
| Reconnect test that only asserts the connection reopened | Does not verify listener re-subscription or queued-event delivery | Assert notification receipt after reconnect (Step 8) |

## Limitations

- This skill covers the notification feature layer. For WebSocket frame-level
  protocol tests (masking, fragmentation, opcode handling per RFC 6455
  Sections 5.2-5.4) and SSE stream-format tests, use
  [`websocket-tests`](../../qa-realtime-protocols/skills/websocket-tests/SKILL.md)
  and
  [`server-sent-events-tests`](../../qa-realtime-protocols/skills/server-sent-events-tests/SKILL.md)
  in `qa-realtime-protocols`.
- Firebase emulator covers most RTDB / Firestore behavior; a small set of
  server-side trigger behaviors (Cloud Functions fan-out) require a real
  Firebase project.
- SSE ordering guarantees depend on server implementation; the WHATWG spec
  defines client-side `lastEventId` tracking but does not mandate server
  ordering.
- WebSocket `terminate()` simulates abnormal closure (`1006`); graceful
  `close()` sends a proper close frame per RFC 6455 Section 7.

## References

- [RFC 6455 - The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
  (Sections 4.1-4.2 opening handshake, 5.2 data framing, 7.4.1 close codes)
- [WHATWG HTML Living Standard - Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
  (`EventSource` states, `lastEventId`, `retry`, reconnection algorithm)
- [Firebase RTDB - Read and Write](https://firebase.google.com/docs/database/web/read-and-write)
  (`onValue`, `get`, `off` signatures and behavior)
- [Firebase RTDB - Offline Capabilities](https://firebase.google.com/docs/database/web/offline-capabilities)
  (`/.info/connected`, `onDisconnect`, offline write queue, server timestamps)
- [Firebase Firestore - Listen to Real-time Updates](https://firebase.google.com/docs/firestore/query-data/listen)
  (`onSnapshot`, `hasPendingWrites`, `fromCache`, latency compensation)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
  (RTDB + Firestore emulator usage for offline/reconnect testing)
- [`websocket-tests`](../../qa-realtime-protocols/skills/websocket-tests/SKILL.md),
  [`server-sent-events-tests`](../../qa-realtime-protocols/skills/server-sent-events-tests/SKILL.md)
  in `qa-realtime-protocols` - transport-layer protocol tests
- [`push-notification-test-author`](../push-notification-test-author/SKILL.md),
  [`email-flow-test-author`](../email-flow-test-author/SKILL.md),
  [`sms-test-author`](../sms-test-author/SKILL.md),
  [`webhook-delivery-tester`](../webhook-delivery-tester/SKILL.md)
  - sibling channels this skill does not cover
