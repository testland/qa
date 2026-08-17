'use strict';

const USERS = {
  ada: { user: 'ada', displayName: 'Ada L.', role: 'admin' },
  grace: { user: 'grace', displayName: 'Grace H.', role: 'auditor' },
};

let active = null;

function signIn(user) {
  const record = USERS[user];
  if (!record) {
    throw new Error(`unknown user: ${user}`);
  }
  active = { ...record };
  return active;
}

function activeSession() {
  return active;
}

function signOut() {
  active = null;
}

function permissions() {
  if (!active) {
    throw new Error('no active session');
  }
  return active.role === 'admin' ? ['read', 'write', 'admin'] : ['read'];
}

module.exports = { signIn, activeSession, signOut, permissions };
