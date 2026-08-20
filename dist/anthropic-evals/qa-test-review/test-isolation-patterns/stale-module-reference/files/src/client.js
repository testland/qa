'use strict';

const { settings } = require('./settings');

const config = settings();

let cachedEndpoint = null;

function endpoint() {
  if (cachedEndpoint === null) {
    cachedEndpoint = `${config.endpoint}/v1/${config.region}`;
  }
  return cachedEndpoint;
}

function retries() {
  return config.retries;
}

function resetCache() {
  cachedEndpoint = null;
}

module.exports = { endpoint, retries, resetCache };
