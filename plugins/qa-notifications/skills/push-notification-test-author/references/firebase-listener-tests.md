# Firebase listener tests (RTDB + Firestore)

Provider-specific variants of the in-app notification workflow. The core
WebSocket / SSE and notification-store tests live in [in-app.md](in-app.md); this file holds
the Firebase Realtime Database and Firestore listener patterns plus the offline
write-queue behavior they share. Run both against the
[Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
so listener tests never hit production.

## Realtime Database (`onValue`)

Per the [RTDB read/write docs](https://firebase.google.com/docs/database/web/read-and-write),
`onValue()` fires once immediately with current data and again on every
subsequent change at that location and below. RTDB uses a persistent WebSocket
internally.

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, connectDatabaseEmulator } from 'firebase/database';

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

## Firestore (`onSnapshot`)

Per the [Firestore listen docs](https://firebase.google.com/docs/firestore/query-data/listen),
`onSnapshot()` fires immediately with the current document and again on each
change. The snapshot carries `metadata.hasPendingWrites` (true when local
changes are not yet backend-confirmed) and `metadata.fromCache` (true when
served from the local cache). Offline-then-reconnect tests assert `fromCache`
transitions.

```javascript
import { getFirestore, doc, onSnapshot, setDoc, connectFirestoreEmulator } from 'firebase/firestore';

const firestoreDb = getFirestore(app);
connectFirestoreEmulator(firestoreDb, '127.0.0.1', 8080);

it('delivers live notification and clears pending-writes flag', (done) => {
  const notifDoc = doc(firestoreDb, 'notifications', 'n-99');
  const states = [];
  const unsub = onSnapshot(notifDoc, { includeMetadataChanges: true }, (snap) => {
    if (!snap.exists()) return;
    states.push({ pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache });
    if (states.length >= 2 && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) {
      expect(states[0].pending).toBe(true);
      expect(states[states.length - 1].pending).toBe(false);
      unsub();
      done();
    }
  });

  setDoc(notifDoc, { type: 'INVOICE_READY', read: false });
});
```

## Offline write queue and reconnect

The RTDB SDK queues writes locally when offline and delivers them after
reconnect, per the
[offline capabilities docs](https://firebase.google.com/docs/database/web/offline-capabilities).
Connection state is exposed at `/.info/connected` (a boolean updated on every
connection state change; individual client state only, not global). In
integration tests, assert `/.info/connected` transitions from `false` to `true`
on reconnect to confirm the client re-established its listener subscriptions
before asserting notification delivery.
