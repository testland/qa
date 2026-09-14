const test = require('node:test');
const assert = require('node:assert');
const { buildSessionCookie, parseCookieHeader } = require('../src/legacy/session/cookies.js');

test('session cookie carries Secure and HttpOnly by default', () => {
  const c = buildSessionCookie('abc123');
  assert.match(c, /; Secure$/);
  assert.match(c, /; HttpOnly; /);
});

test('max-age is emitted in seconds', () => {
  const c = buildSessionCookie('abc123', { maxAgeMs: 60000 });
  assert.match(c, /Max-Age=60/);
});

test('cookie values are url-encoded', () => {
  assert.match(buildSessionCookie('a b/c'), /atlas_sid=a%20b%2Fc/);
});

test('header parsing round-trips a built cookie name', () => {
  const parsed = parseCookieHeader('atlas_sid=abc123; Path=/; SameSite=Lax');
  assert.strictEqual(parsed.atlas_sid, 'abc123');
  assert.strictEqual(parsed.Path, '/');
});
