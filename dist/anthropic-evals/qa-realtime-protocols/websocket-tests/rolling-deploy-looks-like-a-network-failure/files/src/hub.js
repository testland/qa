'use strict';

const MAX_IDLE_MS = 120_000;

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

  // The peer has not been heard from in two minutes; nobody is left to answer a close frame.
  idleSweep(at) {
    for (const [socket, session] of this.sockets) {
      if (at - session.lastSeen > MAX_IDLE_MS) {
        socket.terminate();
      }
    }
  }

  drain() {
    for (const socket of this.sockets.keys()) {
      socket.terminate();
    }
    this.sockets.clear();
  }
}

module.exports = { Hub, MAX_IDLE_MS };
