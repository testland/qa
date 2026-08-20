'use strict';

const { BaseTest } = require('./BaseTest');
const { globalConfig } = require('../../src/config');

class AppTest extends BaseTest {
  async setUp() {
    await super.setUp();
    globalConfig.featureFlags.ordersV2 = true;
    this.app = createApp({ config: globalConfig });
  }
}

module.exports = { AppTest };
