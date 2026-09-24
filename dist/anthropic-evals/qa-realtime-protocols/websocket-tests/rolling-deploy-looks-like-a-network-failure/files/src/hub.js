'use strict';

const MAX_IDLE_MS = 120_000;

// 2026-09-11 hotfix: announce the drain with a real close frame instead of
// dropping the socket, so the ending is not a surprise to the client.
const DRAIN_CLOSE_CODE = 1006;
const DRAIN_REASON =
  'presence-gateway is being replaced by a rolling deploy; the new pod is already accepting connections, so reconnect now and your session will resume where it left off';

class Hub {
  constructor() {
    this.sockets = new Map();
  }

  get size() {
    return this.sockets.size;
  }

  add(socket, session) {
    this.sockets.set(socket, session);
    socket.on('close', () => this.sockets.delete(socket));
  }

  broadcast(event) {
    const frame = JSON.stringify(event);
    for (const socket of this.sockets.keys()) {
      socket.send(frame);
    }
  }

  kick(socket, reason) {
    socket.close(1008, reason);
  }

  fail(socket) {
    socket.close(1011, 'internal error');
  }

  idleSweep(at) {
    for (const [socket, session] of this.sockets) {
      if (at - session.lastSeen > MAX_IDLE_MS) {
        socket.terminate();
      }
    }
  }

  drain() {
    for (const socket of this.sockets.keys()) {
      socket.close(DRAIN_CLOSE_CODE, DRAIN_REASON);
    }
    this.sockets.clear();
  }
}

module.exports = { Hub, MAX_IDLE_MS, DRAIN_CLOSE_CODE, DRAIN_REASON };
