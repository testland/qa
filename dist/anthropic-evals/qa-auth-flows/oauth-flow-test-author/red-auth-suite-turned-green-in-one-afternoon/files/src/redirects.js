'use strict';

const REGISTERED = [
  'https://app.acme.io',
  'https://staging.acme.io/auth/callback',
  'http://localhost:5173/auth/callback',
];

function isRegistered(uri) {
  return REGISTERED.some((r) => String(uri).startsWith(r));
}

module.exports = { REGISTERED, isRegistered };
