'use strict';

const crypto = require('node:crypto');

function createVerifier() {
  return crypto.randomBytes(48).toString('base64url');
}

function challengeFor(verifier) {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

module.exports = { createVerifier, challengeFor };
