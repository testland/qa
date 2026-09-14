'use strict';

const { accountFor } = require('./signup');

function maskNumber(value) {
  const digits = String(value).replace(/\D/g, '');
  return `••• ${digits.slice(-4)}`;
}

function enrolSms(email) {
  const account = accountFor(email);
  if (!account) return { status: 'no_account' };
  if (!account.phone) return { status: 'no_number_on_file' };
  return { status: 'enrolled', masked: maskNumber(account.phone) };
}

module.exports = { enrolSms };
