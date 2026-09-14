'use strict';

const { EventEmitter } = require('node:events');

class FakeClientSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 'connecting';
  }

  succeed() {
    this.readyState = 'open';
    this.emit('open');
  }

  drop(code = 1006, reason = '') {
    this.readyState = 'closed';
    this.emit('close', code, reason);
  }
}

module.exports = { FakeClientSocket };
