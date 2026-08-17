'use strict';

const tenancy = require('../../src/tenancy');

let n = 0;

function makeOrg() {
  return tenancy.createOrg(`org ${(n += 1)}`);
}

function makeUser(org, email) {
  return tenancy.createUser(org.id, email || `user${(n += 1)}@example.test`);
}

function makeApiKey(user) {
  return tenancy.issueApiKey(user.id);
}

module.exports = { makeOrg, makeUser, makeApiKey };
