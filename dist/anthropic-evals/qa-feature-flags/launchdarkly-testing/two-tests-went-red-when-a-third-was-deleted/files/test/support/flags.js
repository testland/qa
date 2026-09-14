'use strict';
const LaunchDarkly = require('launchdarkly-node-server-sdk');

const td = LaunchDarkly.TestData.dataSource();
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: td, sendEvents: false });

let initialized;
function ready() {
  if (!initialized) initialized = client.waitForInitialization();
  return initialized;
}

module.exports = { td, client, ready };
