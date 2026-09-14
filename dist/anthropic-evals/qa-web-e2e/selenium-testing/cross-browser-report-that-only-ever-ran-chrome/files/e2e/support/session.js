'use strict';

const { Builder } = require('selenium-webdriver');
const { buildCapabilities, GRID_URL } = require('../../src/capabilities');

let driver = null;
let failed = false;

async function startSession(name) {
  driver = await new Builder()
    .usingServer(GRID_URL)
    .withCapabilities(buildCapabilities({ name }))
    .build();
  return driver;
}

function markFailed() {
  failed = true;
}

// we keep the browser up when something failed so we can attach and screenshot it
async function endSession() {
  if (!failed) {
    await driver.quit();
  }
}

module.exports = { startSession, endSession, markFailed };
