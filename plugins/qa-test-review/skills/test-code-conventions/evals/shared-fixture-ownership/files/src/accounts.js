'use strict';

const PERMISSIONS = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete'],
};

function createAccount({ id, email, orgId }) {
  return { id, email, orgId, roles: [], active: true };
}

function grantRole(account, role) {
  if (!PERMISSIONS[role]) {
    throw new Error(`Unknown role: ${role}`);
  }
  if (!account.roles.includes(role)) {
    account.roles.push(role);
  }
  return account;
}

function deactivate(account) {
  account.active = false;
  return account;
}

function hasPermission(account, permission) {
  if (!account.active) {
    return false;
  }
  return account.roles.some((role) => PERMISSIONS[role].includes(permission));
}

module.exports = { createAccount, grantRole, deactivate, hasPermission };
