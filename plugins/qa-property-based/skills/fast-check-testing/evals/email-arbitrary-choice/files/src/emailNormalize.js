'use strict';

function normalizeEmail(input) {
  const trimmed = String(input).trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return trimmed;
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  return `${local}@${domain}`;
}

function domainOf(email) {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1);
}

module.exports = { normalizeEmail, domainOf };
