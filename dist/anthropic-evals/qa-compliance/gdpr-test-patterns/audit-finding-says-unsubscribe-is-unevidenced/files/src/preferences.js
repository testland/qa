'use strict';

const { revokeConsent } = require('./consent');

function unsubscribe({ email, scope, at }) {
  const result = revokeConsent(email, scope);
  if (result.status === 'not_found') return { status: 404 };
  return { status: 200, scope, at };
}

module.exports = { unsubscribe };
