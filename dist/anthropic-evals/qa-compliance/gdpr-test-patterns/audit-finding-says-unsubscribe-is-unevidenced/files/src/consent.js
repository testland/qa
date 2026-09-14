'use strict';

const users = new Map();
const consents = [];

function reset() {
  users.clear();
  consents.length = 0;
}

function signup({ email, displayName, consentMarketing, at, via = 'signup-form' }) {
  const user = { email, displayName, marketingOptIn: Boolean(consentMarketing), createdAt: at };
  users.set(email, user);
  consents.push({
    email,
    scope: 'marketing',
    granted: Boolean(consentMarketing),
    grantedAt: consentMarketing ? at : null,
    grantedVia: via,
    revokedAt: null,
  });
  return user;
}

function consentFor(email, scope) {
  return consents.find((c) => c.email === email && c.scope === scope) || null;
}

function revokeConsent(email, scope) {
  const consent = consentFor(email, scope);
  if (!consent) return { status: 'not_found' };
  consent.granted = false;
  return { status: 'revoked' };
}

function setMarketingOptIn(email, value) {
  const user = users.get(email);
  if (!user) return null;
  user.marketingOptIn = Boolean(value);
  return user;
}

function getUser(email) {
  return users.get(email) || null;
}

module.exports = { reset, signup, consentFor, revokeConsent, setMarketingOptIn, getUser };
