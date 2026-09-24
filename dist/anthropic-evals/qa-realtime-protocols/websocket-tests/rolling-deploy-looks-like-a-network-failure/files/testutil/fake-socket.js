'use strict';

const { EventEmitter } = require('node:events');

// Stands in for one server-side connection and records the control frames written to it.
class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.sent = [];
    this.closeFrame = null;
    this.terminated = false;
    this.readyState = 'open';
  }

  send(frame) {
    this.sent.push(frame);
  }

  close(code, reason = '') {
    if (this.readyState !== 'open') {
      return;
    }
    this.closeFrame = { code, reason };
    this.readyState = 'closing';
    process.nextTick(() => {
      this.readyState = 'closed';
      this.emit('close', code, reason, true);
    });
  }

  terminate() {
    if (this.readyState === 'closed') {
      return;
    }
    this.terminated = true;
    this.readyState = 'closed';
    process.nextTick(() => this.emit('close', 1006, '', false));
  }
}

module.exports = { FakeSocket };
