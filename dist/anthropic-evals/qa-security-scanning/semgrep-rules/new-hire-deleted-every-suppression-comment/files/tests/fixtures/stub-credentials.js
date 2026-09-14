// Fixtures for the auth stub server. Nothing here is real, nothing here is
// ever sent off-box: the stub server answers on 127.0.0.1 and is torn down in
// the test teardown. Do not reuse these values anywhere outside tests/.

// Suppression removed by #1180; shown here as it was on main:
//   // nosemgrep: generic.secrets.security.detected-generic-api-key
const STUB_API_KEY = 'sk_test_REDACTED';

const STUB_USERS = [
  { id: 'u_1', email: 'ada@example.test', role: 'admin' },
  { id: 'u_2', email: 'grace@example.test', role: 'viewer' },
];

module.exports = { STUB_API_KEY, STUB_USERS };
