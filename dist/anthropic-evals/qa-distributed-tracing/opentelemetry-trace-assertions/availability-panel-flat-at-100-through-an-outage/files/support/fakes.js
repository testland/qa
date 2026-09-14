'use strict';

function liveTransport(rate) {
  return {
    async get() {
      return { status: 200, body: { rate } };
    },
  };
}

function deadTransport(message = 'ECONNREFUSED rates.fxprovider.example:443') {
  return {
    async get() {
      const err = new Error(message);
      err.name = 'ConnectionRefusedError';
      err.code = 'ECONNREFUSED';
      throw err;
    },
  };
}

function cacheWith(rate, ageSeconds = 21600) {
  return {
    lastKnown() {
      return rate;
    },
    ageSeconds() {
      return ageSeconds;
    },
  };
}

module.exports = { liveTransport, deadTransport, cacheWith };
