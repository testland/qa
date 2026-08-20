'use strict';

const { createAccount, grantRole } = require('../src/accounts');

const org = { id: 'org-42', name: 'Acme', plan: 'team', seats: 25 };

const account = createAccount({ id: 'u-1', email: 'ada@acme.test', orgId: org.id });
grantRole(account, 'editor');

const knownRoles = ['viewer', 'editor', 'admin'];

module.exports = { org, account, knownRoles };
