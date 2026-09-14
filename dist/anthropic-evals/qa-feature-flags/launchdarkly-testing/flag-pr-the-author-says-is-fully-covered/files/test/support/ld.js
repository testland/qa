'use strict';
const LaunchDarkly = require('launchdarkly-node-server-sdk');

const td = LaunchDarkly.TestData.dataSource();

const client = LaunchDarkly.init('sdk-test-key', {
  updateProcessor: td,
  sendEvents: false,
});

module.exports = { td, client };
