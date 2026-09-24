// Fixtures for the auth stub server, which answers on 127.0.0.1 only.

// Suppression removed by #1180; shown here as it was on main:
//   // nosemgrep: generic.secrets.security.detected-generic-api-key
const STUB_API_KEY = 'sk_test_REDACTED';

const STUB_USERS = [
  { id: 'u_1', email: 'ada@example.test', role: 'admin' },
  { id: 'u_2', email: 'grace@example.test', role: 'viewer' },
];

module.exports = { STUB_API_KEY, STUB_USERS };
