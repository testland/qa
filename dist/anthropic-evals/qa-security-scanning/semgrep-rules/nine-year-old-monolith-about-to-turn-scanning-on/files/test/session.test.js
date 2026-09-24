const test = require('node:test');
const assert = require('node:assert');
const {
  buildSupportCookie,
  supportSessionId,
  cookieMaxAgeSeconds,
} = require('../src/api/support/session.js');

test('the support cookie carries HttpOnly and SameSite', () => {
  const c = buildSupportCookie('s_1');
  assert.match(c, /; HttpOnly$/);
  assert.match(c, /SameSite=Lax/);
});

test('max-age is emitted in seconds', () => {
  assert.strictEqual(cookieMaxAgeSeconds({ maxAgeMs: 60000 }), 60);
});

test('cookie values are url-encoded', () => {
  assert.match(buildSupportCookie('a b/c'), /atlas_support=a%20b%2Fc/);
});

test('the session id round-trips out of a cookie header', () => {
  assert.strictEqual(supportSessionId('atlas_support=s_9; Path=/support'), 's_9');
});
