'use strict';

class BaseTest {
  async setUp() {
    this.startedAt = Date.now();
    this.logger = createLogger({ level: 'error' });
  }

  async tearDown() {
    this.logger.flush();
  }
}

module.exports = { BaseTest };
