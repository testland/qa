'use strict';

const GRID_URL = process.env.GRID_URL || 'http://localhost:4444';

function buildCapabilities(options = {}) {
  const browserName = process.env.BROWSER || 'chrome';
  return {
    browserName,
    platformName: 'linux',
    'se:name': options.name || 'e2e',
    'se:recordVideo': false,
  };
}

module.exports = { buildCapabilities, GRID_URL };
