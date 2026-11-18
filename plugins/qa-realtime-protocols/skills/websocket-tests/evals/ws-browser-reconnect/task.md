# Our live-updates client caused a reconnect storm

## Problem Description

Our live-updates client caused a reconnect storm and has a logout bug that our tests miss (`src/live.js`, `test/live.test.js`, `docs/incident.md`). Fix the client and its tests.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/live.js ===============
// Browser client for live order updates.
export function connect(url, onEvent) {
  let ws;
  function open() {
    ws = new WebSocket(url);
    ws.onmessage = (e) => onEvent(JSON.parse(e.data));
    ws.onclose = () => setTimeout(open, 1000);      // always reconnect after 1 s
  }
  open();
  return {
    // called when the user logs out or the tab is hidden for a long time
    stop(reason = 'client is going away because the user logged out or the tab has been hidden for more than ten minutes') {
      ws.close(1001, reason);
    },
  };
}

=============== FILE: test/live.test.js ===============
import { connect } from '../src/live.js';

class FakeSocket { constructor(url) { FakeSocket.last = this; } close(code, reason) { this.closed = { code, reason }; } }
global.WebSocket = FakeSocket;

test('stop closes the socket', () => {
  const c = connect('wss://example.test/live', () => {});
  c.stop();
  expect(FakeSocket.last.closed.code).toBe(1001);
});

test('server drop triggers reconnect', () => {
  // the server should send 1006 when it drops us
  FakeSocket.last.onclose({ code: 1006 });
});

=============== FILE: docs/incident.md ===============
After a deploy restarted all gateway pods, 40k browsers reconnected within the same second and the
new pods fell over again. Revoked sessions also reconnect forever: the server closes them with 4401.
QA reports that logging out throws "InvalidAccessError" in Chrome, but our unit test passes.
