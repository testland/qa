'use strict';

const seen = [];

function record(dispute) {
  seen.push(dispute);
  return seen.length;
}

function disputes() {
  return seen.slice();
}

function reset() {
  seen.length = 0;
}

module.exports = { record, disputes, reset };
