'use strict';

const defaults = { region: 'eu', endpoint: 'https://eu.api.test', retries: 2 };

let current = { ...defaults };

function settings() {
  return current;
}

function configure(patch) {
  Object.assign(current, patch);
}

function reset() {
  current = { ...defaults };
}

module.exports = { defaults, settings, configure, reset };
