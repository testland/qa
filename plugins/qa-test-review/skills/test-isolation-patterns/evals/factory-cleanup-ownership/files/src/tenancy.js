'use strict';

const orgs = new Map();
const users = new Map();
const keys = new Map();
let seq = 1;

function createOrg(name) {
  const org = { id: `org-${seq++}`, name };
  orgs.set(org.id, org);
  return org;
}

function createUser(orgId, email) {
  if (!orgs.has(orgId)) throw new Error(`no such org ${orgId}`);
  for (const user of users.values()) {
    if (user.email === email) throw new Error(`email ${email} already exists`);
  }
  const user = { id: `user-${seq++}`, orgId, email };
  users.set(user.id, user);
  return user;
}

function issueApiKey(userId) {
  if (!users.has(userId)) throw new Error(`no such user ${userId}`);
  const key = { id: `key-${seq++}`, userId };
  keys.set(key.id, key);
  return key;
}

function revokeApiKey(id) { keys.delete(id); }

function deleteUser(id) {
  for (const key of keys.values()) {
    if (key.userId === id) throw new Error(`user ${id} still has api keys`);
  }
  users.delete(id);
}

function deleteOrg(id) {
  for (const user of users.values()) {
    if (user.orgId === id) throw new Error(`org ${id} still has users`);
  }
  orgs.delete(id);
}

function deleteAllUsers() { users.clear(); }

function usersIn(orgId) { return [...users.values()].filter((u) => u.orgId === orgId); }

function keysFor(userId) { return [...keys.values()].filter((k) => k.userId === userId); }

function counts() { return { orgs: orgs.size, users: users.size, keys: keys.size }; }

module.exports = {
  createOrg, createUser, issueApiKey, revokeApiKey, deleteUser, deleteOrg,
  deleteAllUsers, usersIn, keysFor, counts,
};
