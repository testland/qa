'use strict';

const people = [
  { personId: '0a1f2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d', displayName: 'Priya Raman', email: 'priya@acme.example' },
  { personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', displayName: 'Tom Ilves', email: 'tom@ilves.example' },
  { personId: '2c3d4e5f-6071-4c8d-ae1f-2a3b4c5d6e7f', displayName: 'Hana Okafor', email: 'hana@globex.example' },
  { personId: '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80', displayName: 'Ben Larsen', email: 'ben@globex.example' },
];

const members = [
  { tenantId: 'acme', memberNo: 1, personId: '0a1f2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d', role: 'admin' },
  { tenantId: 'acme', memberNo: 2, personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', role: 'member' },
  { tenantId: 'globex', memberNo: 1, personId: '2c3d4e5f-6071-4c8d-ae1f-2a3b4c5d6e7f', role: 'admin' },
  { tenantId: 'globex', memberNo: 2, personId: '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80', role: 'member' },
  { tenantId: 'globex', memberNo: 3, personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', role: 'member' },
];

const preferences = [
  { personId: '0a1f2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d', theme: 'dark', digest: 'daily', timezone: 'Europe/London' },
  { personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', theme: 'light', digest: 'weekly', timezone: 'Europe/Tallinn' },
  { personId: '2c3d4e5f-6071-4c8d-ae1f-2a3b4c5d6e7f', theme: 'light', digest: 'off', timezone: 'Africa/Lagos' },
  { personId: '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80', theme: 'dark', digest: 'daily', timezone: 'Europe/Oslo' },
];

const orgs = [
  { tenantId: 'acme', orgName: 'Acme Supply Co', region: 'eu-west', seatLimit: 250 },
  { tenantId: 'globex', orgName: 'Globex Industrial', region: 'us-east', seatLimit: 40 },
];

module.exports = { people, members, preferences, orgs };
