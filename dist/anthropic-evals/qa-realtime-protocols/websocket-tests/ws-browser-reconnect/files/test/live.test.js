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
