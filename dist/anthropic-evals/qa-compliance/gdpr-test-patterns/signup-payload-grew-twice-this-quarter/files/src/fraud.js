'use strict';

const { accountFor } = require('./signup');

const INTERNAL_PREFIX = '10.';

function riskScore(email) {
  const account = accountFor(email);
  if (!account) return { status: 'no_account', score: null };
  if (!account.signup_ip) return { status: 'no_ip_on_file', score: null };
  return { status: 'scored', score: account.signup_ip.startsWith(INTERNAL_PREFIX) ? 0 : 40 };
}

module.exports = { riskScore };
