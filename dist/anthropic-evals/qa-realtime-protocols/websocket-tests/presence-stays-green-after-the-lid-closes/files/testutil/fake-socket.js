'use strict';

const { EventEmitter } = require('node:events');

// Stands in for one server-side connection and records every frame written to it.
class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.sent = [];
    this.pings = [];
    this.pongs = [];
    this.closeFrame = null;
    this.terminated = false;
  }

  send(frame) {
    this.sent.push(frame);
  }

  ping(payload = '') {
    this.pings.push(payload);
  }

  pong(payload = '') {
    this.pongs.push(payload);
  }

  close(code, reason = '') {
    this.closeFrame = { code, reason };
    this.emit('close', code, reason, true);
  }

  terminate() {
    this.terminated = true;
    this.emit('close', 1006, '', false);
  }

  // The peer answers our ping.
  replyPong(payload = '') {
    this.emit('pong', payload);
  }

  // The peer sends us a data frame.
  deliver(frame) {
    this.emit('message', frame);
  }
}

module.exports = { FakeSocket };
