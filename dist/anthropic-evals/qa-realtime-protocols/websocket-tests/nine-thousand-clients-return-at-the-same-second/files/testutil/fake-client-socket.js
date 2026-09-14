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

  drop(code = 1006) {
    this.readyState = 'closed';
    this.emit('close', code);
  }
}

module.exports = { FakeClientSocket };
